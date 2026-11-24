/**
 * Job directories. Paths are derived only from server-generated UUIDs and
 * file names; every resolved path is checked to stay inside the job root.
 */
import { mkdir, readdir, rm, stat, statfs } from 'node:fs/promises';
import path from 'node:path';
import { FerryError } from '@ferry/shared/errors';
import { UUID_RE } from '../security/tokens.js';

/**
 * @param {{ jobsDir: string, limits: { minFreeDiskMb: number, maxStorageMb: number }, logger?: import('pino').Logger }} opts
 */
export function createJobStorage({ jobsDir, limits, logger }) {
  const root = path.resolve(jobsDir);
  let usageCache = { at: 0, bytes: 0 };

  function dirFor(jobId) {
    if (!UUID_RE.test(jobId)) throw new FerryError('JOB_NOT_FOUND');
    const dir = path.join(root, jobId);
    if (path.dirname(dir) !== root) throw new FerryError('JOB_NOT_FOUND');
    return dir;
  }

  async function dirSize(dir) {
    let total = 0;
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return 0;
    }
    for (const e of entries) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) total += await dirSize(p);
      else if (e.isFile()) total += (await stat(p).catch(() => ({ size: 0 }))).size;
    }
    return total;
  }

  return {
    root,
    dirFor,
    dirSize,

    /** Create the root and remove leftovers from a previous run (jobs are in-memory). */
    async init() {
      await mkdir(root, { recursive: true, mode: 0o700 });
      const entries = await readdir(root, { withFileTypes: true });
      let removed = 0;
      for (const e of entries) {
        if (e.isDirectory() && UUID_RE.test(e.name)) {
          await rm(path.join(root, e.name), { recursive: true, force: true });
          removed += 1;
        }
      }
      if (removed) logger?.info({ removed }, 'storage: purged orphaned job directories');
    },

    async ensure(jobId) {
      const jobDir = dirFor(jobId);
      const tmpDir = path.join(jobDir, 'tmp');
      await mkdir(tmpDir, { recursive: true, mode: 0o700 });
      return { jobDir, tmpDir };
    },

    async remove(jobId) {
      try {
        await rm(dirFor(jobId), { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
      } catch (err) {
        logger?.warn({ err, jobId }, 'storage: failed to remove job directory');
      }
    },

    /** Absolute path of a file inside a job directory (server-generated names only). */
    filePath(jobId, diskName) {
      if (!/^[A-Za-z0-9._-]{1,80}$/.test(diskName) || diskName.includes('..')) throw new FerryError('NOT_FOUND');
      const dir = dirFor(jobId);
      const full = path.join(dir, diskName);
      if (path.dirname(full) !== dir) throw new FerryError('NOT_FOUND');
      return full;
    },

    async usageBytes({ maxAgeMs = 10_000 } = {}) {
      if (Date.now() - usageCache.at > maxAgeMs) usageCache = { at: Date.now(), bytes: await dirSize(root) };
      return usageCache.bytes;
    },

    async freeBytes() {
      try {
        const s = await statfs(root);
        return Number(s.bavail) * Number(s.bsize);
      } catch {
        return null;
      }
    },

    /** Refuse new work when the disk or the configured storage cap is exhausted. */
    async assertCapacity() {
      const free = await this.freeBytes();
      if (free != null && free < limits.minFreeDiskMb * 1024 * 1024) {
        throw new FerryError('INSUFFICIENT_STORAGE', { internal: `free ${Math.round(free / 1e6)} MB`, retryAfter: 120 });
      }
      const used = await this.usageBytes({ maxAgeMs: 2000 });
      if (used > limits.maxStorageMb * 1024 * 1024) {
        throw new FerryError('INSUFFICIENT_STORAGE', { internal: `storage cap reached ${Math.round(used / 1e6)} MB`, retryAfter: 120 });
      }
    },
  };
}
