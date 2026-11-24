#!/usr/bin/env node
/**
 * Ferry server entry point (ROLE=all: API + worker + egress guard).
 */
import { BRAND } from '@ferry/shared/brand';
import { loadConfig } from './config.js';
import { createLogger } from './logger.js';
import { createFerry } from './bootstrap.js';

let config;
try {
  config = loadConfig();
} catch (err) {
  console.error(`Configuration error: ${err.message}`);
  process.exit(1);
}
const logger = createLogger(config.log);

const ferry = await createFerry(config, { logger });
const addr = await ferry.listen();
const shown = addr.address.includes(':') ? `[${addr.address}]` : addr.address;
logger.info({ env: config.env, dataDir: config.dataDir, engines: Object.fromEntries(Object.entries(ferry.services.engineStatus).map(([k, v]) => [k, v.version])) }, `${BRAND.name} ${BRAND.version} listening on http://${shown}:${addr.port}`);

let stopping = false;
async function shutdown(signal) {
  if (stopping) return;
  stopping = true;
  logger.info({ signal }, 'shutting down');
  const force = setTimeout(() => process.exit(1), 15_000);
  force.unref();
  try {
    await ferry.close();
  } finally {
    process.exit(0);
  }
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (err) => logger.error({ err }, 'unhandled rejection'));
