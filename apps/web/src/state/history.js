import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { storage } from '../lib/storage.js';

const MAX = 500;

/** On-device download history (never sent to the server). */
export const useHistory = create(
  persist(
    (set) => ({
      entries: [],
      upsert: (entry) =>
        set((s) => {
          const i = s.entries.findIndex((e) => e.id === entry.id);
          if (i === -1) return { entries: [entry, ...s.entries].slice(0, MAX) };
          const next = [...s.entries];
          next[i] = { ...next[i], ...entry };
          return { entries: next };
        }),
      update: (id, patch) => set((s) => ({ entries: s.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)) })),
      remove: (id) => set((s) => ({ entries: s.entries.filter((e) => e.id !== id) })),
      clear: () => set({ entries: [] }),
    }),
    { name: 'ferry:history:v1', version: 1, storage: createJSONStorage(() => storage.zustand) },
  ),
);
