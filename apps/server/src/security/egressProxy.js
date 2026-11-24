/**
 * Egress guard proxy.
 *
 * A local HTTP proxy (127.0.0.1, random port) that every engine process is
 * forced to use. For each connection it:
 *   1. authenticates per-job credentials (other local processes can't use it),
 *   2. resolves the destination itself and rejects non-public addresses,
 *   3. connects to the *validated* IP (defeats DNS rebinding),
 *   4. counts bytes per job and cuts the job off at its size cap (covers
 *      HLS/DASH, where yt-dlp's --max-filesize does not apply).
 *
 * Supports CONNECT tunnels (HTTPS) and absolute-form plain-HTTP requests.
 */
import http from 'node:http';
import net from 'node:net';
import { randomBytes, timingSafeEqual } from 'node:crypto';

export const BLOCK_REASON_PHRASE = 'Ferry Blocked Destination';
export const LIMIT_REASON_PHRASE = 'Ferry Size Limit';

const HOP_BY_HOP = new Set([
  'connection', 'proxy-connection', 'keep-alive', 'proxy-authorization', 'proxy-authenticate', 'te', 'trailer', 'upgrade',
]);

function parseAuthority(authority) {
  // "host:port" or "[v6]:port"
  const m = /^\[([0-9a-fA-F:.]+)\]:(\d{1,5})$/.exec(authority) ?? /^([^:\s/]+):(\d{1,5})$/.exec(authority);
  if (!m) return null;
  const port = Number(m[2]);
  if (!port || port > 65535) return null;
  return { host: m[1], port };
}

/**
 * @param {{
 *   guard: { resolveDestination: (host: string, port: number) => Promise<{ address: string }> },
 *   logger?: import('pino').Logger,
 *   maxConnections?: number,
 *   idleTimeoutMs?: number,
 *   connectTimeoutMs?: number,
 *   connect?: typeof net.connect,
 * }} opts
 */
export async function startEgressProxy({ guard, logger, maxConnections = 256, idleTimeoutMs = 60_000, connectTimeoutMs = 15_000, connect = net.connect }) {
  /** @type {Map<string, Session>} */
  const sessions = new Map();
  const stats = { tunnels: 0, requests: 0, blocked: 0, bytesIn: 0, bytesOut: 0, active: 0 };

  /**
   * @typedef {{ tag: string, pass: Buffer, bytesIn: number, bytesOut: number, maxBytes: number,
   *   blocked: { host: string, reason: string }[], exceeded: boolean, sockets: Set<net.Socket>, onLimit?: () => void }} Session
   */

  const server = http.createServer();
  server.headersTimeout = 10_000;
  server.requestTimeout = 0; // long downloads over plain HTTP

  function authenticate(req) {
    const h = req.headers['proxy-authorization'];
    if (typeof h !== 'string' || !h.startsWith('Basic ')) return null;
    const decoded = Buffer.from(h.slice(6), 'base64').toString('utf8');
    const i = decoded.indexOf(':');
    if (i < 1) return null;
    const session = sessions.get(decoded.slice(0, i));
    if (!session) return null;
    const pass = Buffer.from(decoded.slice(i + 1));
    if (pass.length !== session.pass.length || !timingSafeEqual(pass, session.pass)) return null;
    return session;
  }

  function track(session, socket) {
    session.sockets.add(socket);
    socket.once('close', () => session.sockets.delete(socket));
  }

  function countIn(session, n) {
    session.bytesIn += n;
    stats.bytesIn += n;
    if (!session.exceeded && session.bytesIn > session.maxBytes) {
      session.exceeded = true;
      logger?.warn({ tag: session.tag, bytes: session.bytesIn }, 'egress: size limit exceeded, cutting connections');
      for (const s of session.sockets) s.destroy();
      session.onLimit?.();
    }
  }

  function recordBlock(session, host, err) {
    stats.blocked += 1;
    const reason = err?.internal ?? err?.message ?? 'blocked';
    if (session) session.blocked.push({ host, reason });
    logger?.info({ tag: session?.tag, host, reason }, 'egress: destination blocked');
  }

  // --- CONNECT tunnels (HTTPS) ---------------------------------------------
  server.on('connect', async (req, clientSocket, head) => {
    clientSocket.on('error', () => {});
    const session = authenticate(req);
    if (!session) {
      clientSocket.end('HTTP/1.1 407 Proxy Authentication Required\r\nProxy-Authenticate: Basic realm="ferry"\r\nContent-Length: 0\r\n\r\n');
      return;
    }
    if (session.exceeded) {
      clientSocket.end(`HTTP/1.1 403 ${LIMIT_REASON_PHRASE}\r\nContent-Length: 0\r\n\r\n`);
      return;
    }
    if (stats.active >= maxConnections) {
      clientSocket.end('HTTP/1.1 503 Service Unavailable\r\nContent-Length: 0\r\n\r\n');
      return;
    }
    const target = parseAuthority(req.url ?? '');
    if (!target) {
      clientSocket.end('HTTP/1.1 400 Bad Request\r\nContent-Length: 0\r\n\r\n');
      return;
    }
    let resolved;
    try {
      resolved = await guard.resolveDestination(target.host, target.port);
    } catch (err) {
      recordBlock(session, target.host, err);
      const phrase = err?.code === 'BLOCKED_DESTINATION' ? BLOCK_REASON_PHRASE : 'Bad Gateway';
      const code = err?.code === 'BLOCKED_DESTINATION' ? 403 : 502;
      clientSocket.end(`HTTP/1.1 ${code} ${phrase}\r\nContent-Length: 0\r\n\r\n`);
      return;
    }

    stats.tunnels += 1;
    stats.active += 1;
    const upstream = connect({ host: resolved.address, port: target.port });
    track(session, upstream);
    track(session, clientSocket);
    let established = false;
    const connectTimer = setTimeout(() => upstream.destroy(new Error('connect timeout')), connectTimeoutMs);
    const finish = () => {
      clearTimeout(connectTimer);
      if (upstream.__ferryDone) return;
      upstream.__ferryDone = true;
      stats.active -= 1;
    };
    upstream.setTimeout(idleTimeoutMs, () => upstream.destroy());
    clientSocket.setTimeout(idleTimeoutMs, () => clientSocket.destroy());
    upstream.once('connect', () => {
      clearTimeout(connectTimer);
      established = true;
      clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
      if (head?.length) upstream.write(head);
      upstream.on('data', (chunk) => countIn(session, chunk.length));
      clientSocket.on('data', (chunk) => {
        session.bytesOut += chunk.length;
        stats.bytesOut += chunk.length;
      });
      upstream.pipe(clientSocket);
      clientSocket.pipe(upstream);
    });
    upstream.on('error', () => {
      if (!established && clientSocket.writable) clientSocket.end('HTTP/1.1 502 Bad Gateway\r\nContent-Length: 0\r\n\r\n');
      else clientSocket.destroy();
    });
    upstream.once('close', () => {
      finish();
      clientSocket.destroy();
    });
    clientSocket.once('close', () => upstream.destroy());
  });

  // --- absolute-form plain HTTP -------------------------------------------
  server.on('request', async (req, res) => {
    let target;
    try {
      target = new URL(req.url ?? '');
    } catch {
      res.writeHead(400).end();
      return;
    }
    if (target.protocol !== 'http:') {
      res.writeHead(400).end();
      return;
    }
    const session = authenticate(req);
    if (!session) {
      res.writeHead(407, { 'Proxy-Authenticate': 'Basic realm="ferry"' }).end();
      return;
    }
    if (session.exceeded) {
      res.writeHead(403, LIMIT_REASON_PHRASE).end();
      return;
    }
    if (target.username || target.password) {
      res.writeHead(403, BLOCK_REASON_PHRASE).end();
      return;
    }
    const port = Number(target.port) || 80;
    let resolved;
    try {
      resolved = await guard.resolveDestination(target.hostname, port);
    } catch (err) {
      recordBlock(session, target.hostname, err);
      res.writeHead(err?.code === 'BLOCKED_DESTINATION' ? 403 : 502, err?.code === 'BLOCKED_DESTINATION' ? BLOCK_REASON_PHRASE : 'Bad Gateway').end();
      return;
    }
    const headers = {};
    for (const [k, v] of Object.entries(req.headers)) if (!HOP_BY_HOP.has(k.toLowerCase())) headers[k] = v;
    headers.host = target.host;
    stats.requests += 1;
    stats.active += 1;
    const upstreamReq = http.request(
      {
        host: resolved.address,
        port,
        method: req.method,
        path: `${target.pathname}${target.search}`,
        headers,
        setHost: false,
        timeout: idleTimeoutMs,
      },
      (upstreamRes) => {
        const outHeaders = {};
        for (const [k, v] of Object.entries(upstreamRes.headers)) if (!HOP_BY_HOP.has(k.toLowerCase())) outHeaders[k] = v;
        res.writeHead(upstreamRes.statusCode ?? 502, upstreamRes.statusMessage, outHeaders);
        upstreamRes.on('data', (chunk) => countIn(session, chunk.length));
        upstreamRes.pipe(res);
      },
    );
    upstreamReq.on('socket', (s) => track(session, s));
    upstreamReq.on('timeout', () => upstreamReq.destroy(new Error('timeout')));
    upstreamReq.on('error', () => {
      if (!res.headersSent) res.writeHead(502).end();
      else res.destroy();
    });
    upstreamReq.on('close', () => {
      stats.active -= 1;
    });
    req.pipe(upstreamReq);
  });

  server.on('clientError', (_err, socket) => socket.destroy());

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve(undefined));
  });
  const { port } = /** @type {net.AddressInfo} */ (server.address());

  return {
    port,
    stats,
    /**
     * Issue credentials for one job/probe. Revoke when the engine exits.
     * @param {{ tag: string, maxBytes?: number, onLimit?: () => void }} p
     */
    issue({ tag, maxBytes = Number.POSITIVE_INFINITY, onLimit }) {
      const user = `u${randomBytes(9).toString('base64url')}`.replace(/[^A-Za-z0-9]/g, 'x');
      const pass = randomBytes(24).toString('base64url').replace(/[^A-Za-z0-9]/g, 'y');
      /** @type {Session} */
      const session = { tag, pass: Buffer.from(pass), bytesIn: 0, bytesOut: 0, maxBytes, blocked: [], exceeded: false, sockets: new Set(), onLimit };
      sessions.set(user, session);
      return {
        url: `http://${user}:${pass}@127.0.0.1:${port}`,
        session,
        revoke() {
          sessions.delete(user);
          for (const s of session.sockets) s.destroy();
        },
      };
    },
    async close() {
      for (const s of sessions.values()) for (const so of s.sockets) so.destroy();
      sessions.clear();
      await new Promise((resolve) => server.close(() => resolve(undefined)));
    },
  };
}
