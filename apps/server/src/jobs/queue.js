/**
 * In-process priority queue (MVP driver; BullMQ is the scale-out driver).
 *
 *  - priority (lower first), then FIFO
 *  - global concurrency
 *  - optional per-key concurrency (per-platform politeness limits)
 *  - bounded waiting length (QUEUE_FULL)
 *  - abort running work with a reason ('cancel' | 'pause' | 'shutdown')
 */
import { FerryError } from '@ferry/shared/errors';

export class LocalQueue {
  #waiting = [];
  /** @type {Map<string, { controller: AbortController, key: string|null }>} */
  #running = new Map();
  /** @type {Map<string, number>} */
  #runningByKey = new Map();
  #seq = 0;
  #closed = false;

  /**
   * @param {{ concurrency: number, maxLength: number, keyLimit?: (key: string) => number,
   *   run: (item: { id: string, key: string|null }, signal: AbortSignal) => Promise<void>, onError?: (err: unknown, id: string) => void }} opts
   */
  constructor({ concurrency, maxLength, keyLimit = () => Infinity, run, onError = () => {} }) {
    this.concurrency = concurrency;
    this.maxLength = maxLength;
    this.keyLimit = keyLimit;
    this.run = run;
    this.onError = onError;
  }

  get waiting() {
    return this.#waiting.length;
  }

  get active() {
    return this.#running.size;
  }

  has(id) {
    return this.#running.has(id) || this.#waiting.some((w) => w.id === id);
  }

  /** @param {{ id: string, priority?: number, key?: string|null }} item */
  enqueue({ id, priority = 10, key = null }) {
    if (this.#closed) throw new FerryError('QUEUE_FULL', { internal: 'queue closed' });
    if (this.has(id)) return;
    if (this.#waiting.length >= this.maxLength) throw new FerryError('QUEUE_FULL', { retryAfter: 30 });
    const entry = { id, priority, key, seq: this.#seq++ };
    const i = this.#waiting.findIndex((w) => w.priority > priority || (w.priority === priority && w.seq > entry.seq));
    if (i === -1) this.#waiting.push(entry);
    else this.#waiting.splice(i, 0, entry);
    queueMicrotask(() => this.#pump());
  }

  /** Remove a job that has not started. */
  remove(id) {
    const i = this.#waiting.findIndex((w) => w.id === id);
    if (i === -1) return false;
    this.#waiting.splice(i, 1);
    return true;
  }

  /** Abort a running job. */
  abort(id, reason = 'cancel') {
    const r = this.#running.get(id);
    if (!r) return false;
    r.controller.abort(reason);
    return true;
  }

  /** 1-based position among waiting jobs, or null. */
  position(id) {
    const i = this.#waiting.findIndex((w) => w.id === id);
    return i === -1 ? null : i + 1;
  }

  #pump() {
    while (this.#running.size < this.concurrency) {
      const idx = this.#waiting.findIndex((w) => !w.key || (this.#runningByKey.get(w.key) ?? 0) < this.keyLimit(w.key));
      if (idx === -1) return;
      const [item] = this.#waiting.splice(idx, 1);
      const controller = new AbortController();
      this.#running.set(item.id, { controller, key: item.key });
      if (item.key) this.#runningByKey.set(item.key, (this.#runningByKey.get(item.key) ?? 0) + 1);
      Promise.resolve()
        .then(() => this.run({ id: item.id, key: item.key }, controller.signal))
        .catch((err) => this.onError(err, item.id))
        .finally(() => {
          this.#running.delete(item.id);
          if (item.key) this.#runningByKey.set(item.key, Math.max(0, (this.#runningByKey.get(item.key) ?? 1) - 1));
          this.#pump();
        });
    }
  }

  /** Stop accepting work and abort everything running. */
  async close() {
    this.#closed = true;
    this.#waiting = [];
    for (const r of this.#running.values()) r.controller.abort('shutdown');
    const deadline = Date.now() + 10_000;
    while (this.#running.size && Date.now() < deadline) await new Promise((r) => setTimeout(r, 50));
  }
}

/** Counting semaphore with bounded wait (used for probes). */
export class Semaphore {
  #available;
  #waiters = [];

  constructor(n) {
    this.#available = n;
  }

  /** @param {number} waitMs */
  async acquire(waitMs) {
    if (this.#available > 0) {
      this.#available -= 1;
      return () => this.#release();
    }
    return new Promise((resolve, reject) => {
      const waiter = { resolve: () => resolve(() => this.#release()), timer: null };
      waiter.timer = setTimeout(() => {
        this.#waiters = this.#waiters.filter((w) => w !== waiter);
        reject(new FerryError('BUSY', { retryAfter: 5 }));
      }, waitMs);
      this.#waiters.push(waiter);
    });
  }

  #release() {
    const next = this.#waiters.shift();
    if (next) {
      clearTimeout(next.timer);
      next.resolve();
    } else {
      this.#available += 1;
    }
  }
}
