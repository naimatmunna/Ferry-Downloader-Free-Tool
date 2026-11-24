/**
 * In-memory job store (MVP driver). Enforces the shared state machine on
 * every status change. A Redis-backed driver can implement the same methods.
 */
import { EventEmitter } from 'node:events';
import { assertTransition, isActive, JOB_STATUSES } from '@ferry/shared/jobs';

export class MemoryJobStore extends EventEmitter {
  /** @type {Map<string, any>} */
  #jobs = new Map();

  create(job) {
    if (this.#jobs.has(job.id)) throw new Error(`job ${job.id} exists`);
    const now = Date.now();
    const stored = { ...job, createdAt: job.createdAt ?? now, updatedAt: now };
    this.#jobs.set(job.id, stored);
    this.emit('change', stored, 'created');
    return stored;
  }

  get(id) {
    return this.#jobs.get(id) ?? null;
  }

  /**
   * Apply a patch. `progress` is merged; a status change is validated.
   * @param {string} id
   * @param {object} patch
   */
  update(id, patch) {
    const job = this.#jobs.get(id);
    if (!job) return null;
    if (patch.status && patch.status !== job.status) assertTransition(job.status, patch.status);
    const { progress, ...rest } = patch;
    Object.assign(job, rest);
    if (progress) job.progress = { ...job.progress, ...progress };
    job.updatedAt = Date.now();
    this.emit('change', job, patch.status ? 'status' : 'progress');
    return job;
  }

  delete(id) {
    const job = this.#jobs.get(id);
    if (!job) return false;
    this.#jobs.delete(id);
    this.emit('change', job, 'deleted');
    return true;
  }

  *all() {
    yield* this.#jobs.values();
  }

  activeCountForClient(clientKey) {
    let n = 0;
    for (const j of this.#jobs.values()) if (j.clientKey === clientKey && isActive(j.status)) n += 1;
    return n;
  }

  stats() {
    const byStatus = Object.fromEntries(JOB_STATUSES.map((s) => [s, 0]));
    for (const j of this.#jobs.values()) byStatus[j.status] += 1;
    return { total: this.#jobs.size, byStatus };
  }
}
