/**
 * Download manager state: tracked jobs (id + capability token), live job
 * snapshots, a local submission queue that respects the device's concurrency
 * setting, and a polling loop (1 s while anything is active, 5 s when the tab
 * is hidden, immediate refresh when the page becomes visible).
 */
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { isActive } from '@ferry/shared/jobs';
import { ApiError, api, archiveHref, fileHref } from '../lib/api.js';
import { saveFile } from '../lib/download.js';
import { useHistory } from './history.js';
import { useSettings } from './settings.js';

const ACTIVE = (job) => job && isActive(job.status);
let timer = null;
let polling = false;
/** Hooks the UI registers for announcements (kept out of the store to avoid cycles). */
export const downloadEvents = { onReady: null, onFailed: null, onSaved: null, onError: null };

function historyEntry(job, meta) {
  const { privacy } = useSettings.getState();
  if (!privacy.saveHistory) return null;
  return {
    id: job.id,
    createdAt: Date.parse(job.createdAt) || Date.now(),
    status: job.status,
    platformId: job.source.platformId,
    platformName: job.source.platformName,
    title: job.source.title,
    uploader: job.source.uploader,
    durationSec: job.source.durationSec,
    sourceUrl: privacy.saveSourceLinks ? meta?.sourceUrl ?? null : null,
    request: job.request,
    output: null,
    errorCode: null,
  };
}

export const useDownloads = create(
  persist(
    (set, get) => ({
      /** @type {Record<string, { id: string, token: string, addedAt: number, meta: any, saved: boolean }>} */
      tracked: {},
      /** @type {Record<string, any>} */
      jobs: {},
      /** Local queue of submissions waiting for a free slot. */
      queue: [],

      activeCount() {
        return Object.values(get().jobs).filter(ACTIVE).length;
      },

      /** Queue one or more job submissions; returns immediately. */
      enqueue(items) {
        set((s) => ({ queue: [...s.queue, ...items] }));
        get().pump();
      },

      async pump() {
        const limit = useSettings.getState().concurrency;
        while (get().queue.length && get().activeCount() < limit) {
          const [item, ...rest] = get().queue;
          set({ queue: rest });
          await get().submit(item);
        }
      },

      async submit(item) {
        try {
          const { job, token } = await api.createJob(item.body);
          set((s) => ({
            tracked: { ...s.tracked, [job.id]: { id: job.id, token, addedAt: Date.now(), meta: item.meta ?? {}, saved: false } },
            jobs: { ...s.jobs, [job.id]: job },
          }));
          const entry = historyEntry(job, item.meta);
          if (entry) useHistory.getState().upsert(entry);
          schedule(400);
          return job;
        } catch (err) {
          if (err instanceof ApiError && ['TOO_MANY_ACTIVE_JOBS', 'QUEUE_FULL', 'RATE_LIMITED'].includes(err.code)) {
            // Server is full: put it back and try again shortly.
            set((s) => ({ queue: [item, ...s.queue] }));
            setTimeout(() => get().pump(), (err.retryAfter ?? 10) * 1000);
            return null;
          }
          downloadEvents.onError?.(err, item);
          throw err;
        }
      },

      async poll() {
        const { tracked, jobs } = get();
        const ids = Object.keys(tracked).filter((id) => {
          const j = jobs[id];
          return !j || ACTIVE(j) || j.status === 'ready';
        });
        if (!ids.length) return;
        for (let i = 0; i < ids.length; i += 50) {
          const chunk = ids.slice(i, i + 50).map((id) => ({ id, token: tracked[id].token }));
          let res;
          try {
            res = await api.jobStatus(chunk);
          } catch {
            return; // offline or server restarting: keep snapshots, try again later
          }
          for (const r of res.jobs) {
            const prev = get().jobs[r.id];
            if (r.job) {
              set((s) => ({ jobs: { ...s.jobs, [r.id]: r.job } }));
              get().onTransition(prev, r.job);
            } else if (r.error && ['JOB_NOT_FOUND', 'JOB_EXPIRED', 'FORBIDDEN'].includes(r.error.code)) {
              const gone = { ...(prev ?? { id: r.id, source: {}, request: {} }), status: 'expired', output: null, progress: {} };
              set((s) => ({ jobs: { ...s.jobs, [r.id]: gone } }));
              if (prev && prev.status !== 'expired') useHistory.getState().update(r.id, { status: prev.status === 'ready' ? (get().tracked[r.id]?.saved ? 'saved' : 'expired') : prev.status });
            }
          }
        }
        get().pump();
      },

      onTransition(prev, job) {
        if (!prev || prev.status === job.status) return;
        const history = useHistory.getState();
        if (job.status === 'ready') {
          history.update(job.id, {
            status: 'ready',
            completedAt: Date.now(),
            output: job.output.files.map((f) => ({ name: f.name, sizeBytes: f.sizeBytes, mime: f.mime, kind: f.kind })),
          });
          downloadEvents.onReady?.(job);
          if (useSettings.getState().autoSave) get().save(job.id, job.output.files[0]?.id, { auto: true });
        } else if (job.status === 'failed') {
          history.update(job.id, { status: 'failed', errorCode: job.error?.code ?? null });
          downloadEvents.onFailed?.(job);
        } else if (job.status === 'cancelled') {
          history.update(job.id, { status: 'cancelled' });
        }
      },

      /** Hand a file to the browser's download manager. */
      save(id, fileId, { auto = false } = {}) {
        const t = get().tracked[id];
        const job = get().jobs[id];
        const file = job?.output?.files.find((f) => f.id === fileId) ?? job?.output?.files[0];
        if (!t || !file) return;
        saveFile(fileHref(file, t.token));
        set((s) => ({ tracked: { ...s.tracked, [id]: { ...s.tracked[id], saved: true } } }));
        useHistory.getState().update(id, { status: 'saved' });
        downloadEvents.onSaved?.(job, file, auto);
      },

      saveArchive(id) {
        const t = get().tracked[id];
        const job = get().jobs[id];
        const href = job && t ? archiveHref(job, t.token) : null;
        if (!href) return;
        saveFile(href);
        set((s) => ({ tracked: { ...s.tracked, [id]: { ...s.tracked[id], saved: true } } }));
        useHistory.getState().update(id, { status: 'saved' });
      },

      async act(id, action) {
        const t = get().tracked[id];
        if (!t) return;
        const { job } = await api.action(id, t.token, action);
        const prev = get().jobs[id];
        set((s) => ({ jobs: { ...s.jobs, [id]: job } }));
        get().onTransition(prev, job);
        schedule(300);
        if (action === 'cancel') get().pump();
      },

      /** Delete from the server (best effort) and forget locally. */
      async remove(id) {
        const t = get().tracked[id];
        const job = get().jobs[id];
        if (t && job && job.status !== 'expired') {
          try {
            await api.remove(id, t.token);
          } catch {
            /* already gone */
          }
        }
        set((s) => {
          const tracked = { ...s.tracked };
          const jobs = { ...s.jobs };
          delete tracked[id];
          delete jobs[id];
          return { tracked, jobs };
        });
        get().pump();
      },

      async clearFinished() {
        const settled = Object.values(get().jobs).filter((j) => !ACTIVE(j));
        await Promise.all(settled.map((j) => get().remove(j.id)));
      },
    }),
    {
      name: 'ferry:downloads:v1',
      version: 1,
      storage: createJSONStorage(() => storage.zustand),
      partialize: ({ tracked, jobs, queue }) => ({ tracked, jobs, queue }),
    },
  ),
);

async function tick() {
  timer = null;
  if (polling) return;
  polling = true;
  try {
    await useDownloads.getState().poll();
  } finally {
    polling = false;
  }
  const jobs = Object.values(useDownloads.getState().jobs);
  const anyActive = jobs.some(ACTIVE) || useDownloads.getState().queue.length > 0;
  const anyReady = jobs.some((j) => j.status === 'ready');
  const hidden = typeof document !== 'undefined' && document.hidden;
  if (anyActive) schedule(hidden ? 5000 : 1000);
  else if (anyReady) schedule(30_000);
}

export function schedule(ms) {
  if (timer) clearTimeout(timer);
  timer = setTimeout(tick, ms);
}

/** Start polling for jobs restored from a previous visit. */
export function startDownloadSync() {
  schedule(0);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) schedule(0);
  });
  window.addEventListener('online', () => schedule(0));
}
