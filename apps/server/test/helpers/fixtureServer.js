/**
 * Local HTTP server for self-authored fixtures (see scripts/make-fixtures.mjs).
 *
 * Routes:
 *   /<file>                 static file with Range/ETag support
 *   /slow/<file>?bps=N      throttled transfer (progress, pause/resume tests)
 *   /flaky/<file>           500 on the first request per file, then OK (retry tests)
 *   /redirect/<file>        302 → /<file>
 *   /redirect-to?url=…      302 → arbitrary URL (SSRF redirect tests)
 *   /gone                   404
 */
import { createReadStream, existsSync, statSync } from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const FIXTURES_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../.fixtures');

const TYPES = {
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.flac': 'audio/flac', '.ogg': 'audio/ogg',
  '.jpg': 'image/jpeg', '.vtt': 'text/vtt', '.html': 'text/html; charset=utf-8', '.m3u8': 'application/vnd.apple.mpegurl', '.ts': 'video/mp2t',
};

export async function startFixtureServer({ dir = FIXTURES_DIR, host = '127.0.0.1', port = 0 } = {}) {
  if (!existsSync(path.join(dir, 'clip-h264-aac.mp4'))) {
    throw new Error(`Fixtures missing in ${dir}. Run: npm run fixtures`);
  }
  const flakySeen = new Set();
  const hits = new Map();

  const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    hits.set(url.pathname, (hits.get(url.pathname) ?? 0) + 1);
    let pathname = decodeURIComponent(url.pathname);
    let bps = 0;

    if (pathname === '/gone') return void res.writeHead(404).end('gone');
    if (pathname === '/redirect-to') return void res.writeHead(302, { location: url.searchParams.get('url') ?? '/' }).end();
    if (pathname.startsWith('/redirect/')) return void res.writeHead(302, { location: pathname.slice('/redirect'.length) }).end();
    if (pathname.startsWith('/flaky/')) {
      pathname = pathname.slice('/flaky'.length);
      if (!flakySeen.has(pathname)) {
        flakySeen.add(pathname);
        return void res.writeHead(500).end('try again');
      }
    }
    if (pathname.startsWith('/flaky-download/')) {
      // Probes (bounded ranges) succeed; the first full download fails once.
      pathname = pathname.slice('/flaky-download'.length);
      const bounded = /^bytes=\d+-\d+$/.test(req.headers.range ?? '');
      if (!bounded && !flakySeen.has(`dl:${pathname}`)) {
        flakySeen.add(`dl:${pathname}`);
        res.writeHead(200, { 'content-type': 'video/mp4', 'content-length': '1000000' });
        res.write(Buffer.alloc(1000));
        setTimeout(() => res.destroy(), 50); // connection drops mid-transfer
        return;
      }
    }
    if (pathname.startsWith('/slow/')) {
      pathname = pathname.slice('/slow'.length);
      bps = Number(url.searchParams.get('bps')) || 200_000;
    }

    const file = path.join(dir, pathname);
    if (!file.startsWith(dir + path.sep) || !existsSync(file) || !statSync(file).isFile()) return void res.writeHead(404).end('not found');
    const st = statSync(file);
    const etag = `"${st.size}-${Math.floor(st.mtimeMs)}"`;
    const type = TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream';
    const headers = { 'content-type': type, 'accept-ranges': 'bytes', etag, 'last-modified': st.mtime.toUTCString() };

    let start = 0;
    let end = st.size - 1;
    let status = 200;
    const range = req.headers.range && /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
    if (range) {
      if (range[1] !== '') start = Number(range[1]);
      if (range[2] !== '') end = Math.min(Number(range[2]), st.size - 1);
      if (range[1] === '' && range[2] !== '') {
        start = Math.max(0, st.size - Number(range[2]));
        end = st.size - 1;
      }
      if (start > end || start >= st.size) return void res.writeHead(416, { 'content-range': `bytes */${st.size}` }).end();
      status = 206;
      headers['content-range'] = `bytes ${start}-${end}/${st.size}`;
    }
    headers['content-length'] = String(end - start + 1);
    res.writeHead(status, headers);
    if (req.method === 'HEAD') return void res.end();

    const stream = createReadStream(file, { start, end, highWaterMark: bps ? Math.max(1024, Math.floor(bps / 10)) : 64 * 1024 });
    if (!bps) return void stream.pipe(res);
    stream.on('data', (chunk) => {
      stream.pause();
      res.write(chunk, () => setTimeout(() => stream.resume(), Math.ceil((chunk.length / bps) * 1000)));
    });
    stream.on('end', () => res.end());
    res.on('close', () => stream.destroy());
  });

  await new Promise((resolve) => server.listen(port, host, resolve));
  ({ port } = server.address());
  return {
    port,
    host,
    origin: `http://${host}:${port}`,
    authority: `${host}:${port}`,
    url: (p) => `http://${host}:${port}${p.startsWith('/') ? p : `/${p}`}`,
    hits,
    close: () => new Promise((resolve) => {
      server.closeAllConnections?.();
      server.close(() => resolve(undefined));
    }),
  };
}
