/**
 * Job lifecycle. The transition table is the single source of truth for both
 * the server's job store (which rejects illegal transitions) and the client
 * (which derives available actions).
 */

export const JOB_STATUS = Object.freeze({
  QUEUED: 'queued',
  DOWNLOADING: 'downloading',
  PAUSED: 'paused',
  PROCESSING: 'processing',
  READY: 'ready',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
});

export const JOB_STATUSES = Object.freeze(Object.values(JOB_STATUS));

/** @type {Readonly<Record<string, readonly string[]>>} */
export const TRANSITIONS = Object.freeze({
  queued: Object.freeze(['downloading', 'failed', 'cancelled']),
  downloading: Object.freeze(['processing', 'paused', 'failed', 'cancelled']),
  paused: Object.freeze(['queued', 'cancelled', 'expired']),
  processing: Object.freeze(['ready', 'failed', 'cancelled']),
  ready: Object.freeze(['expired']),
  failed: Object.freeze(['queued', 'expired']),
  cancelled: Object.freeze(['expired']),
  expired: Object.freeze([]),
});

/** Jobs that still occupy a client's active-job allowance. */
export const ACTIVE_STATUSES = Object.freeze(['queued', 'downloading', 'paused', 'processing']);
/** States after which no more work happens for the current attempt. */
export const SETTLED_STATUSES = Object.freeze(['ready', 'failed', 'cancelled', 'expired']);

export const MAX_ATTEMPTS = 3;

/**
 * @param {string} from
 * @param {string} to
 */
export function canTransition(from, to) {
  return (TRANSITIONS[from] ?? []).includes(to);
}

/**
 * @param {string} from
 * @param {string} to
 * @throws {Error} when the transition is not allowed
 */
export function assertTransition(from, to) {
  if (!canTransition(from, to)) {
    const err = new Error(`Illegal job transition ${from} -> ${to}`);
    err.code = 'INVALID_STATE';
    throw err;
  }
}

/** @param {string} status */
export function isActive(status) {
  return ACTIVE_STATUSES.includes(status);
}

/** @param {string} status */
export function isSettled(status) {
  return SETTLED_STATUSES.includes(status);
}

/**
 * Actions a client may offer for a job snapshot.
 * @param {{ status: string, attempt?: number, maxAttempts?: number, error?: { retryable?: boolean } | null }} job
 */
export function actionsFor(job) {
  const s = job.status;
  const attempt = job.attempt ?? 1;
  const max = job.maxAttempts ?? MAX_ATTEMPTS;
  return {
    pause: s === 'downloading',
    resume: s === 'paused',
    cancel: isActive(s),
    retry: s === 'failed' && Boolean(job.error?.retryable) && attempt < max,
    delete: s !== 'expired',
  };
}
