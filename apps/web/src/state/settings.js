import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { storage } from '../lib/storage.js';

function browserLanguage() {
  try {
    const l = (navigator.language || 'en').slice(0, 2).toLowerCase();
    return l === 'es' || l === 'ar' ? l : 'en';
  } catch {
    return 'en';
  }
}

export const DEFAULT_SETTINGS = {
  theme: 'system',
  language: browserLanguage(),
  defaults: { mode: 'av', videoContainer: 'mp4', quality: 'best', audioFormat: 'mp3', audioBitrate: 'source', metadata: true },
  filenameTemplate: '{title}',
  concurrency: 2,
  autoSave: true,
  privacy: { saveHistory: true, saveSourceLinks: true, deleteAfterSave: false },
  acknowledgedGenericTerms: false,
};

export const useSettings = create(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      update: (patch) => set(patch),
      setDefaults: (patch) => set((s) => ({ defaults: { ...s.defaults, ...patch } })),
      setPrivacy: (patch) => set((s) => ({ privacy: { ...s.privacy, ...patch } })),
      reset: () => set({ ...DEFAULT_SETTINGS, language: browserLanguage() }),
    }),
    {
      name: 'ferry:settings:v1',
      version: 1,
      storage: createJSONStorage(() => storage.zustand),
      partialize: ({ theme, language, defaults, filenameTemplate, concurrency, autoSave, privacy, acknowledgedGenericTerms }) => ({
        theme,
        language,
        defaults,
        filenameTemplate,
        concurrency,
        autoSave,
        privacy,
        acknowledgedGenericTerms,
      }),
      merge: (persisted, current) => ({
        ...current,
        ...(persisted ?? {}),
        defaults: { ...current.defaults, ...(persisted?.defaults ?? {}) },
        privacy: { ...current.privacy, ...(persisted?.privacy ?? {}) },
      }),
    },
  ),
);

/** Keep <html data-theme> in sync with the setting and the OS preference. */
export function applyTheme(theme) {
  const dark = theme === 'dark' || (theme === 'system' && window.matchMedia?.('(prefers-color-scheme: dark)').matches);
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0A3D47' : '#0B4F5C');
}
