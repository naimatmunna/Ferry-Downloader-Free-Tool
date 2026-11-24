/**
 * Structured logging with redaction. Tokens, authorization headers and query
 * strings never reach the logs; media URLs are logged as a salted hash.
 */
import { createHmac } from 'node:crypto';
import pino from 'pino';

const REDACT = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["proxy-authorization"]',
  'headers.authorization',
  'token',
  '*.token',
  'jobToken',
  'adminToken',
  'password',
  '*.password',
];

/** Minimal human-readable stream for development (avoids a pretty-printer dependency). */
function devStream() {
  const levels = { 10: 'TRACE', 20: 'DEBUG', 30: 'INFO ', 40: 'WARN ', 50: 'ERROR', 60: 'FATAL' };
  return {
    write(line) {
      try {
        const o = JSON.parse(line);
        const { level, time, msg, pid, hostname, ...rest } = o;
        const t = new Date(time).toISOString().slice(11, 23);
        const extra = Object.keys(rest).length ? ` ${JSON.stringify(rest)}` : '';
        process.stdout.write(`${t} ${levels[level] ?? level} ${msg ?? ''}${extra}\n`);
      } catch {
        process.stdout.write(line);
      }
    },
  };
}

/** @param {{ level?: string, pretty?: boolean, destination?: import('node:stream').Writable }} opts */
export function createLogger({ level = 'info', pretty = false, destination } = {}) {
  return pino(
    {
      level,
      redact: { paths: REDACT, censor: '[redacted]' },
      base: undefined,
      serializers: {
        err: (err) => ({
          type: err?.name,
          code: err?.code,
          message: err?.message,
          ...(err?.internal ? { internal: err.internal } : {}),
          ...(level === 'debug' || level === 'trace' ? { stack: err?.stack } : {}),
        }),
      },
    },
    destination ?? (pretty ? devStream() : undefined),
  );
}

/**
 * Stable, non-reversible identifier for a URL in logs and metrics.
 * @param {string} secret
 * @param {string} url
 */
export function urlHash(secret, url) {
  return createHmac('sha256', secret).update(String(url)).digest('base64url').slice(0, 16);
}

/** Path without query string, for request logs. */
export function safePath(originalUrl = '') {
  const q = originalUrl.indexOf('?');
  return q === -1 ? originalUrl : `${originalUrl.slice(0, q)}?…`;
}
