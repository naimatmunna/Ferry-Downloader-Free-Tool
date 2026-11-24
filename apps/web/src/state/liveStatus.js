/**
 * Live site status (the coloured dots), from `GET /api/v1/status`. Loaded when
 * a screen that shows dots opens, at most every 30 seconds. A failure is
 * silent: the dots simply don't appear.
 */
import { useMemo } from 'react';
import { create } from 'zustand';
import { api } from '../lib/api.js';
import { liveDot } from '../lib/siteStatus.js';

const MIN_GAP_MS = 30_000;
let inflight = null;

export const useLiveStatus = create((set, get) => ({
  /** @type {Record<string, { status: string, window: '1h'|'24h', attempts: number, successRate: number }>} */
  sites: {},
  loadedAt: 0,

  load() {
    if (inflight) return inflight;
    if (Date.now() - get().loadedAt < MIN_GAP_MS) return Promise.resolve();
    inflight = api
      .status()
      .then(
        (s) => set({ sites: s?.platforms ?? {}, loadedAt: Date.now() }),
        () => set({ loadedAt: Date.now() }),
      )
      .finally(() => {
        inflight = null;
      });
    return inflight;
  },
}));

/**
 * The dot for one site (null when there is no recent data). Selects the raw
 * entry (stable until the next load) and derives in render: a selector that
 * returns a new object would re-render forever.
 */
export function useLiveDot(id) {
  const entry = useLiveStatus((s) => (id ? s.sites[id] : undefined));
  return useMemo(() => liveDot(entry), [entry]);
}
