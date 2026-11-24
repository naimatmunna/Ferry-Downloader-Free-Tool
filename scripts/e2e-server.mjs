#!/usr/bin/env node
/**
 * Local test stack: the self-authored fixture media server + a Ferry server
 * (serving the built web app) that is allowed to reach it. Used for manual
 * checks in a browser and by the Playwright E2E suite. Never use in production:
 * it relies on the test-only SSRF_ALLOW_HOSTS escape hatch.
 *
 *   node scripts/e2e-server.mjs            → http://127.0.0.1:8787
 */
import { mkdtempSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { startFixtureServer } from '../apps/server/test/helpers/fixtureServer.js';
import { loadConfig } from '../apps/server/src/config.js';
import { createFerry } from '../apps/server/src/bootstrap.js';
import { createLogger } from '../apps/server/src/logger.js';

const port = Number(process.env.PORT ?? 8787);
const fixturePort = Number(process.env.FIXTURE_PORT ?? 8899);
const fx = await startFixtureServer({ port: fixturePort });
const dataDir = process.env.DATA_DIR ?? mkdtempSync(path.join(os.tmpdir(), 'ferry-e2e-'));
const config = loadConfig({
  ...process.env,
  NODE_ENV: 'development',
  PORT: String(port),
  HOST: '127.0.0.1',
  DATA_DIR: dataDir,
  SSRF_ALLOW_HOSTS: fx.authority,
  RATE_LIMIT_PROBE_PER_MIN: process.env.RATE_LIMIT_PROBE_PER_MIN ?? '120',
  RATE_LIMIT_JOBS_PER_MIN: process.env.RATE_LIMIT_JOBS_PER_MIN ?? '120',
  MAX_ACTIVE_JOBS_PER_CLIENT: process.env.MAX_ACTIVE_JOBS_PER_CLIENT ?? '8',
});
const logger = createLogger({ level: process.env.LOG_LEVEL ?? 'info', pretty: true });
const ferry = await createFerry(config, { logger });
await ferry.listen(port, '127.0.0.1');
logger.info(`Ferry test stack: http://127.0.0.1:${port}  (fixtures: ${fx.origin})`);

const stop = async () => {
  await ferry.close();
  await fx.close();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
