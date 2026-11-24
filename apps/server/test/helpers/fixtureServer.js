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
 *   /api/v1/statuses/<id>   Mastodon-style status JSON over the gallery fixtures
 *                           (what gallery-dl's Mastodon extractor reads); see GALLERY_POSTS
 */
import { createReadStream, existsSync, statSync } from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const FIXTURES_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../.fixtures');

const TYPES = {
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.flac': 'audio/flac', '.ogg': 'audio/ogg',
  '.jpg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp',
  '.vtt': 'text/vtt', '.html': 'text/html; charset=utf-8', '.m3u8': 'application/vnd.apple.mpegurl', '.ts': 'video/mp2t',
};

/**
 * Posts served as Mastodon statuses: [file, attachment type, width, height, host?].
 * `host: 'localhost'` points an attachment at a name the SSRF guard must refuse.
 */
export const GALLERY_POSTS = Object.freeze({
  111111111: {
    text: '<p>Harbour pictures &amp; a clip</p>',
    media: [['gallery/photo-1.jpg', 'image', 800, 400], ['gallery/photo-2.png', 'image', 640, 640], ['gallery/anim.gif', 'image', 320, 240], ['clip-h264-aac.mp4', 'video', 640, 360], ['gallery/photo-4.webp', 'image', 400, 300]],
  },
  222222222: { text: '<p>One picture and an impostor</p>', media: [['gallery/photo-2.png', 'image', 640, 640], ['gallery/not-an-image.jpg', 'image', 800, 600]] },
  333333333: { text: '<p>Picture on a private address</p>', media: [['gallery/secret.png', 'image', 64, 64, 'localhost']] },
});

function mastodonStatus(id, origin, port) {
  const post = GALLERY_POSTS[id];
  const attachment = ([file, type, width, height, host], i) => {
    const url = `${host ? `http://${host}:${port}` : origin}/${file}`;
    return { id: `${id}${i}`, type, url, preview_url: url, remote_url: null, description: null, blurhash: null, meta: { original: { width, height, size: `${width}x${height}` } } };
  };
  return {
    id: String(id), created_at: '2026-11-20T10:00:00.000Z', in_reply_to_id: null, in_reply_to_account_id: null, reblog: null,
    sensitive: false, spoiler_text: '', visibility: 'public', language: 'en', uri: `${origin}/users/ferry/statuses/${id}`,
    url: `${origin}/@ferry/${id}`, content: post.text, tags: [], emojis: [], mentions: [], card: null, poll: null,
    account: { id: '1', username: 'ferry', acct: 'ferry', display_name: 'Ferry Fixtures', url: `${origin}/@ferry` },
    media_attachments: post.media.map(attachment),
  };
}

export async function startFixtureServer({ dir = FIXTURES_DIR, host = '127.0.0.1', port = 0 } = {}) {
  if (!existsSync(path.join(dir, 'clip-h264-aac.mp4')) || !existsSync(path.join(dir, 'gallery', 'photo-1.jpg'))) {
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
    const statusId = /^\/api\/v1\/statuses\/(\d+)$/.exec(pathname)?.[1];
    if (statusId) {
      const found = GALLERY_POSTS[statusId];
      res.writeHead(found ? 200 : 404, { 'content-type': 'application/json; charset=utf-8' });
      return void res.end(JSON.stringify(found ? mastodonStatus(statusId, `http://${req.headers.host}`, port) : { error: 'Record not found' }));
    }
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
