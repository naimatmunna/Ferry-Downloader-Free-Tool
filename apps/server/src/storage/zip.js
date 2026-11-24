/**
 * Minimal streaming ZIP writer (STORE method — media is already compressed).
 * Uses data descriptors so each file is read exactly once and nothing is
 * buffered beyond one chunk. Limited to < 4 GiB per archive (no ZIP64).
 */
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { crc32 } from 'node:zlib';

export const ZIP_MAX_BYTES = 0xffffffff - 1024 * 1024;

function dosDateTime(d = new Date()) {
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2);
  const date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  return { time, date };
}

/** Total archive size for Content-Length, or null if too large. */
export async function zipSize(entries) {
  let total = 22; // end of central directory
  for (const e of entries) {
    const name = Buffer.from(e.name, 'utf8');
    const { size } = await stat(e.path);
    total += 30 + name.length + size + 16 + 46 + name.length;
  }
  return total > ZIP_MAX_BYTES ? null : total;
}

/**
 * @param {{ name: string, path: string }[]} entries
 * @param {import('node:stream').Writable} out
 */
export async function writeZip(entries, out) {
  const write = (buf) =>
    new Promise((resolve, reject) => {
      if (out.destroyed) return reject(new Error('client closed'));
      out.write(buf, (err) => (err ? reject(err) : resolve(undefined)));
    });
  const { time, date } = dosDateTime();
  const central = [];
  let offset = 0;

  for (const e of entries) {
    const name = Buffer.from(e.name, 'utf8');
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); // version needed
    local.writeUInt16LE(0x0808, 6); // bit 3: data descriptor; bit 11: UTF-8 names
    local.writeUInt16LE(0, 8); // STORE
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(date, 12);
    // crc/sizes are zero here and follow in the data descriptor
    local.writeUInt16LE(name.length, 26);
    await write(Buffer.concat([local, name]));

    let crc = 0;
    let size = 0;
    for await (const chunk of createReadStream(e.path, { highWaterMark: 256 * 1024 })) {
      crc = crc32(chunk, crc);
      size += chunk.length;
      await write(chunk);
    }
    const desc = Buffer.alloc(16);
    desc.writeUInt32LE(0x08074b50, 0);
    desc.writeUInt32LE(crc >>> 0, 4);
    desc.writeUInt32LE(size, 8);
    desc.writeUInt32LE(size, 12);
    await write(desc);

    central.push({ name, crc, size, offset });
    offset += 30 + name.length + size + 16;
  }

  let cdSize = 0;
  for (const c of central) {
    const h = Buffer.alloc(46);
    h.writeUInt32LE(0x02014b50, 0);
    h.writeUInt16LE(20, 4); // version made by
    h.writeUInt16LE(20, 6);
    h.writeUInt16LE(0x0808, 8);
    h.writeUInt16LE(0, 10);
    h.writeUInt16LE(time, 12);
    h.writeUInt16LE(date, 14);
    h.writeUInt32LE(c.crc >>> 0, 16);
    h.writeUInt32LE(c.size, 20);
    h.writeUInt32LE(c.size, 24);
    h.writeUInt16LE(c.name.length, 28);
    h.writeUInt32LE(c.offset, 42);
    await write(Buffer.concat([h, c.name]));
    cdSize += 46 + c.name.length;
  }
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(central.length, 8);
  end.writeUInt16LE(central.length, 10);
  end.writeUInt32LE(cdSize, 12);
  end.writeUInt32LE(offset, 16);
  await write(end);
}
