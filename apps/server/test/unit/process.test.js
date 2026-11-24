import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setTimeout as sleep } from 'node:timers/promises';
import { engineEnv, runProcess, which } from '../../src/engines/process.js';

const NODE = process.execPath;
const env = () => engineEnv();

test('arguments are passed literally — no shell interpretation', async () => {
  const evil = ['; echo pwned', '| whoami', '$(id)', '`id`', '& calc.exe', '%PATH%', "' OR 1=1 --", '--exec', 'a b "c"'];
  const r = await runProcess(NODE, ['-e', 'process.stdout.write(JSON.stringify(process.argv.slice(1)))', '--', ...evil], {
    env: env(),
    collectStdout: true,
  });
  assert.equal(r.code, 0);
  assert.deepEqual(JSON.parse(r.stdout), evil);
});

test('engine environment never contains application secrets', async () => {
  process.env.SIGNING_SECRET = 'top-secret-value';
  process.env.ADMIN_TOKEN = 'admin-secret-value';
  try {
    const r = await runProcess(NODE, ['-e', 'process.stdout.write(JSON.stringify(process.env))'], {
      env: engineEnv({ proxyUrl: 'http://u:p@127.0.0.1:1', homeDir: process.cwd() }),
      collectStdout: true,
    });
    const childEnv = JSON.parse(r.stdout);
    assert.equal(childEnv.SIGNING_SECRET, undefined);
    assert.equal(childEnv.ADMIN_TOKEN, undefined);
    assert.equal(childEnv.YTDLP_NO_PLUGINS, '1');
    assert.equal(childEnv.PYTHONNOUSERSITE, '1');
    assert.equal(childEnv.HTTPS_PROXY, 'http://u:p@127.0.0.1:1');
  } finally {
    delete process.env.SIGNING_SECRET;
    delete process.env.ADMIN_TOKEN;
  }
});

test('stdout/stderr are split into lines (\\n, \\r\\n and \\r)', async () => {
  const out = [];
  const err = [];
  const r = await runProcess(NODE, ['-e', 'process.stdout.write("a\\nb\\r\\nc\\rd"); process.stderr.write("e1\\ne2\\n")'], {
    env: env(),
    onStdoutLine: (l) => out.push(l),
    onStderrLine: (l) => err.push(l),
  });
  assert.equal(r.code, 0);
  assert.deepEqual(out, ['a', 'b', 'c', 'd']);
  assert.deepEqual(err, ['e1', 'e2']);
  assert.match(r.stderr, /e1\ne2/);
});

test('hard timeout kills the process', async () => {
  const t0 = Date.now();
  const r = await runProcess(NODE, ['-e', 'setInterval(() => {}, 1000)'], { env: env(), timeoutMs: 600 });
  assert.equal(r.timedOut, true);
  assert.ok(Date.now() - t0 < 10_000);
});

test('stall watchdog kills a silent process', async () => {
  const r = await runProcess(NODE, ['-e', 'console.log("started"); setInterval(() => {}, 1000)'], {
    env: env(),
    timeoutMs: 30_000,
    stallTimeoutMs: 800,
    onStdoutLine: () => {},
  });
  assert.equal(r.stalled, true);
});

test('abort kills the whole process tree', async () => {
  const ac = new AbortController();
  let grandchildPid;
  const script = `
    const { spawn } = require('node:child_process');
    const gc = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore' });
    console.log('GC ' + gc.pid);
    setInterval(() => {}, 1000);`;
  const p = runProcess(NODE, ['-e', script], {
    env: env(),
    timeoutMs: 30_000,
    onStdoutLine: (l) => {
      if (l.startsWith('GC ')) {
        grandchildPid = Number(l.slice(3));
        ac.abort();
      }
    },
    signal: ac.signal,
  });
  const r = await p;
  assert.equal(r.aborted, true);
  assert.ok(grandchildPid > 0);
  let alive = true;
  for (let i = 0; i < 40 && alive; i += 1) {
    await sleep(100);
    try {
      process.kill(grandchildPid, 0);
    } catch {
      alive = false;
    }
  }
  assert.equal(alive, false, 'grandchild process must be killed with the tree');
});

test('stdout collection is bounded', async () => {
  const r = await runProcess(NODE, ['-e', 'const s = "x".repeat(1024*1024); for (let i=0;i<4;i++) process.stdout.write(s); setInterval(()=>{},1000)'], {
    env: env(),
    collectStdout: true,
    maxStdoutBytes: 1024 * 1024,
    timeoutMs: 20_000,
  });
  assert.equal(r.overflow, true);
  assert.ok(r.stdout.length <= 2 * 1024 * 1024);
});

test('refuses batch files and reports missing executables', async () => {
  assert.throws(() => runProcess('C:\\evil\\run.bat', []), { code: 'INTERNAL_ERROR' });
  assert.throws(() => runProcess('run.CMD', []), { code: 'INTERNAL_ERROR' });
  assert.throws(() => runProcess(NODE, ['ok', 'bad\0arg']), { code: 'INTERNAL_ERROR' });
  // A missing engine is a clear, operator-fixable state, not a generic "server error".
  await assert.rejects(runProcess('ferry-definitely-missing-binary', [], { env: env() }), { code: 'ENGINE_UNAVAILABLE' });
});

test('which finds executables on PATH', async () => {
  assert.ok(await which('ffmpeg'));
  assert.equal(await which('ferry-definitely-missing-binary'), null);
});
