import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import net from 'node:net';
import { createDestinationGuard } from '../../src/security/destination.js';
import { startEgressProxy, BLOCK_REASON_PHRASE } from '../../src/security/egressProxy.js';
import { createGuardedFetch } from '../../src/security/guardedFetch.js';

/** Local "internet": a target server we control. */
let target;
let targetPort;
let privateServer;
let privatePort;

before(async () => {
  target = http.createServer((req, res) => {
    if (req.url === '/big') {
      res.writeHead(200, { 'content-type': 'application/octet-stream' });
      res.end(Buffer.alloc(200_000, 1));
      return;
    }
    if (req.url === '/redirect-private') {
      res.writeHead(302, { location: `http://127.0.0.1:${privatePort}/secret` }).end();
      return;
    }
    if (req.url === '/redirect-file') {
      res.writeHead(302, { location: 'file:///etc/passwd' }).end();
      return;
    }
    if (req.url === '/loop') {
      res.writeHead(302, { location: '/loop' }).end();
      return;
    }
    if (req.url === '/hop') {
      res.writeHead(301, { location: '/json' }).end();
      return;
    }
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true, path: req.url, host: req.headers.host }));
  });
  await new Promise((r) => target.listen(0, '127.0.0.1', r));
  targetPort = target.address().port;
  privateServer = http.createServer((_req, res) => res.end('internal secret'));
  await new Promise((r) => privateServer.listen(0, '127.0.0.1', r));
  privatePort = privateServer.address().port;
});

after(async () => {
  await new Promise((r) => target.close(r));
  await new Promise((r) => privateServer.close(r));
});

function guardWith({ allow = true, resolver } = {}) {
  return createDestinationGuard({
    allowedPorts: [80, 443],
    allowHosts: allow ? [`127.0.0.1:${targetPort}`] : [],
    resolver,
  });
}

function authHeader(url) {
  const u = new URL(url);
  return `Basic ${Buffer.from(`${decodeURIComponent(u.username)}:${decodeURIComponent(u.password)}`).toString('base64')}`;
}

/** Open a CONNECT tunnel; resolves with { statusCode, statusMessage, socket }. */
function connectVia(proxyPort, authority, auth) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port: proxyPort, method: 'CONNECT', path: authority, headers: auth ? { 'proxy-authorization': auth } : {} });
    req.on('connect', (res, socket) => resolve({ statusCode: res.statusCode, statusMessage: res.statusMessage, socket }));
    req.on('response', (res) => resolve({ statusCode: res.statusCode, statusMessage: res.statusMessage, socket: null }));
    req.on('error', reject);
    req.end();
  });
}

function httpOverSocket(socket, path, host) {
  return new Promise((resolve, reject) => {
    let data = '';
    socket.on('data', (c) => (data += c.toString('latin1')));
    socket.on('end', () => resolve(data));
    socket.on('close', () => resolve(data));
    socket.on('error', reject);
    socket.write(`GET ${path} HTTP/1.1\r\nHost: ${host}\r\nConnection: close\r\n\r\n`);
  });
}

test('proxy requires valid per-job credentials', async () => {
  const proxy = await startEgressProxy({ guard: guardWith() });
  try {
    assert.equal((await connectVia(proxy.port, `127.0.0.1:${targetPort}`)).statusCode, 407);
    const cred = proxy.issue({ tag: 'job-a' });
    const wrong = `Basic ${Buffer.from(`${new URL(cred.url).username}:nope`).toString('base64')}`;
    assert.equal((await connectVia(proxy.port, `127.0.0.1:${targetPort}`, wrong)).statusCode, 407);
    cred.revoke();
    assert.equal((await connectVia(proxy.port, `127.0.0.1:${targetPort}`, authHeader(cred.url))).statusCode, 407);
  } finally {
    await proxy.close();
  }
});

test('CONNECT to loopback/private destinations is refused and recorded', async () => {
  const proxy = await startEgressProxy({ guard: guardWith() });
  try {
    const cred = proxy.issue({ tag: 'job-b' });
    for (const authority of [`127.0.0.1:${privatePort}`, '127.0.0.1:443', '169.254.169.254:80', '[::1]:443', '10.0.0.1:443', 'localhost:443']) {
      const r = await connectVia(proxy.port, authority, authHeader(cred.url));
      assert.equal(r.statusCode, 403, authority);
    }
    const r = await connectVia(proxy.port, '93.184.216.34:22', authHeader(cred.url));
    assert.equal(r.statusCode, 403, 'non-allowlisted port');
    assert.ok(cred.session.blocked.length >= 6);
  } finally {
    await proxy.close();
  }
});

test('CONNECT tunnels to an allowed destination and counts bytes', async () => {
  const proxy = await startEgressProxy({ guard: guardWith() });
  try {
    const cred = proxy.issue({ tag: 'job-c' });
    const r = await connectVia(proxy.port, `127.0.0.1:${targetPort}`, authHeader(cred.url));
    assert.equal(r.statusCode, 200);
    const raw = await httpOverSocket(r.socket, '/json', `127.0.0.1:${targetPort}`);
    assert.match(raw, /HTTP\/1\.1 200/);
    assert.match(raw, /"ok":true/);
    assert.ok(cred.session.bytesIn > 0);
  } finally {
    await proxy.close();
  }
});

test('per-job byte cap cuts the connection and fires onLimit', async () => {
  const proxy = await startEgressProxy({ guard: guardWith() });
  try {
    let limited = false;
    const cred = proxy.issue({ tag: 'job-d', maxBytes: 10_000, onLimit: () => (limited = true) });
    const r = await connectVia(proxy.port, `127.0.0.1:${targetPort}`, authHeader(cred.url));
    const raw = await httpOverSocket(r.socket, '/big', `127.0.0.1:${targetPort}`);
    assert.ok(raw.length < 200_000, 'body was truncated');
    assert.equal(cred.session.exceeded, true);
    assert.equal(limited, true);
    // Further connections for the same job are refused.
    assert.equal((await connectVia(proxy.port, `127.0.0.1:${targetPort}`, authHeader(cred.url))).statusCode, 403);
  } finally {
    await proxy.close();
  }
});

test('DNS rebinding and mixed public/private answers are refused', async () => {
  const resolver = async (host) => {
    if (host === 'rebind.test') return [{ address: '127.0.0.1', family: 4 }];
    if (host === 'mixed.test') return [{ address: '93.184.216.34', family: 4 }, { address: '10.0.0.7', family: 4 }];
    if (host === 'metadata.test') return [{ address: '169.254.169.254', family: 4 }];
    if (host === 'mapped.test') return [{ address: '::ffff:127.0.0.1', family: 6 }];
    throw Object.assign(new Error('ENOTFOUND'), { code: 'ENOTFOUND' });
  };
  const proxy = await startEgressProxy({ guard: guardWith({ resolver }) });
  try {
    const cred = proxy.issue({ tag: 'job-e' });
    for (const h of ['rebind.test', 'mixed.test', 'metadata.test', 'mapped.test']) {
      const r = await connectVia(proxy.port, `${h}:443`, authHeader(cred.url));
      assert.equal(r.statusCode, 403, h);
      assert.equal(r.statusMessage, BLOCK_REASON_PHRASE);
    }
    const nx = await connectVia(proxy.port, 'nxdomain.test:443', authHeader(cred.url));
    assert.equal(nx.statusCode, 502);
  } finally {
    await proxy.close();
  }
});

test('a DNS failure is a network error for the job, never a blocked destination', async () => {
  const resolver = async () => {
    throw Object.assign(new Error('query timed out'), { code: 'ETIMEOUT' });
  };
  const proxy = await startEgressProxy({ guard: guardWith({ resolver }) });
  try {
    const cred = proxy.issue({ tag: 'job-dns' });
    const tunnel = await connectVia(proxy.port, 'slow-dns.test:443', authHeader(cred.url));
    assert.equal(tunnel.statusCode, 502);
    const plain = await new Promise((resolve, reject) => {
      const req = http.request({ host: '127.0.0.1', port: proxy.port, path: 'http://slow-dns.test/file.jpg', headers: { 'proxy-authorization': authHeader(cred.url) } }, (res) => resolve(res.statusCode));
      req.on('error', reject);
      req.end();
    });
    assert.equal(plain, 502);
    assert.deepEqual(cred.session.blocked, [], 'only refused destinations are recorded as blocked');
  } finally {
    await proxy.close();
  }
});

/** Like the operating system's resolver: asking for both families waits for the slower one. */
function familyResolver({ v4, v6, calls = [] }) {
  const answer = (spec, family) => (spec === 'hang' ? new Promise(() => {}) : spec === 'none' ? Promise.reject(Object.assign(new Error('ENOTFOUND'), { code: 'ENOTFOUND' })) : Promise.resolve(spec.map((address) => ({ address, family }))));
  return (host, family) => {
    calls.push(`${host}/${family ?? 'any'}`);
    if (family === 4) return answer(v4, 4);
    if (family === 6) return answer(v6, 6);
    return v4 === 'hang' || v6 === 'hang' ? new Promise(() => {}) : answer([...(v4 === 'none' ? [] : v4), ...(v6 === 'none' ? [] : v6)], 4);
  };
}

test('a family that never answers does not hold up the one that does', async () => {
  // Measured on a real network: AAAA for a TikTok CDN host timed out after 15 s; A took 50 ms.
  const guard = createDestinationGuard({ allowedPorts: [443], timeoutMs: 1500, resolver: familyResolver({ v4: ['93.184.216.34'], v6: 'hang' }) });
  const started = Date.now();
  const r = await guard.resolveDestination('cdn.test', 443);
  assert.equal(r.address, '93.184.216.34');
  assert.ok(Date.now() - started < 1000, `took ${Date.now() - started} ms`);
  const v6only = createDestinationGuard({ allowedPorts: [443], timeoutMs: 1500, resolver: familyResolver({ v4: 'none', v6: ['2606:2800:220:1:248:1893:25c8:1946'] }) });
  assert.equal((await v6only.resolveDestination('v6.test', 443)).family, 6);
  const mixed = createDestinationGuard({ allowedPorts: [443], timeoutMs: 1500, resolver: familyResolver({ v4: ['93.184.216.34'], v6: ['::1'] }) });
  await assert.rejects(mixed.resolveDestination('mixed.test', 443), { code: 'BLOCKED_DESTINATION' }, 'every address that arrives is still checked');
});

test('validated answers are reused briefly, so a slow resolver is not asked for every connection', async () => {
  const calls = [];
  const guard = createDestinationGuard({ allowedPorts: [443, 8443], timeoutMs: 1500, resolver: familyResolver({ v4: ['93.184.216.34'], v6: 'none', calls }) });
  await guard.resolveDestination('cdn.test', 443);
  await guard.resolveDestination('cdn.test', 8443);
  assert.deepEqual(calls, ['cdn.test/4', 'cdn.test/6']);
  await assert.rejects(guard.resolveDestination('cdn.test', 22), { code: 'BLOCKED_DESTINATION' }, 'the port rule still applies to cached hosts');
});

test('the proxy connects to the validated IP, not a re-resolved name', async () => {
  const resolver = async () => [{ address: '93.184.216.34', family: 4 }];
  const seen = [];
  // Fake network: record where the proxy connects, then route to our local target.
  const connect = (opts) => {
    seen.push(opts.host);
    return net.connect({ host: '127.0.0.1', port: targetPort });
  };
  const proxy = await startEgressProxy({ guard: guardWith({ resolver }), connect });
  try {
    const cred = proxy.issue({ tag: 'job-f' });
    const r = await connectVia(proxy.port, 'public.test:443', authHeader(cred.url));
    assert.equal(r.statusCode, 200);
    r.socket.destroy();
    assert.deepEqual(seen, ['93.184.216.34']);
  } finally {
    await proxy.close();
  }
});

test('absolute-form plain HTTP through the proxy is validated too', async () => {
  const proxy = await startEgressProxy({ guard: guardWith() });
  try {
    const cred = proxy.issue({ tag: 'job-g' });
    const get = (url) =>
      new Promise((resolve, reject) => {
        const req = http.request({ host: '127.0.0.1', port: proxy.port, path: url, headers: { 'proxy-authorization': authHeader(cred.url) } }, (res) => {
          let body = '';
          res.on('data', (c) => (body += c));
          res.on('end', () => resolve({ status: res.statusCode, body }));
        });
        req.on('error', reject);
        req.end();
      });
    const ok = await get(`http://127.0.0.1:${targetPort}/json`);
    assert.equal(ok.status, 200);
    assert.match(ok.body, new RegExp(`"host":"127.0.0.1:${targetPort}"`));
    assert.equal((await get(`http://127.0.0.1:${privatePort}/secret`)).status, 403);
    assert.equal((await get('/not-a-proxy-request')).status, 400);
  } finally {
    await proxy.close();
  }
});

test('guardedFetch follows safe redirects and re-validates every hop', async () => {
  const fetchG = createGuardedFetch({ guard: guardWith() });
  const ok = await fetchG(`http://127.0.0.1:${targetPort}/hop`);
  assert.equal(ok.status, 200);
  assert.equal((await ok.json(10_000)).path, '/json');

  await assert.rejects(fetchG(`http://127.0.0.1:${targetPort}/redirect-private`), { code: 'BLOCKED_DESTINATION' });
  await assert.rejects(fetchG(`http://127.0.0.1:${targetPort}/redirect-file`), { code: 'BLOCKED_DESTINATION' });
  await assert.rejects(fetchG(`http://127.0.0.1:${targetPort}/loop`), { code: 'NETWORK_ERROR' });
  await assert.rejects(fetchG(`http://127.0.0.1:${privatePort}/secret`), { code: 'BLOCKED_DESTINATION' });
  await assert.rejects(fetchG('http://user:pw@example.com/'), { code: 'BLOCKED_DESTINATION' });
});

test('guardedFetch caps response bodies', async () => {
  const fetchG = createGuardedFetch({ guard: guardWith() });
  const res = await fetchG(`http://127.0.0.1:${targetPort}/big`);
  await assert.rejects(res.buffer(1000), { code: 'FILE_TOO_LARGE' });
});
