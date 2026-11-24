import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import en from './en.js';
import { useSettings } from '../../state/settings.js';

export const LANGUAGES = [
  { id: 'en', label: 'English', dir: 'ltr' },
  { id: 'es', label: 'Español', dir: 'ltr' },
  { id: 'ar', label: 'العربية', dir: 'rtl' },
];

// English ships in the main bundle; other languages load on demand.
const cache = { en };
const loaders = { es: () => import('./es.js'), ar: () => import('./ar.js') };

/** Load a dictionary (used before first render so there is no flash of English). */
export async function preloadDictionary(lang) {
  if (cache[lang] || !loaders[lang]) return;
  try {
    cache[lang] = (await loaders[lang]()).default;
  } catch {
    /* fall back to English */
  }
}

function lookup(dict, key) {
  return key.split('.').reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), dict);
}

function interpolate(str, vars) {
  return str.replace(/\{(\w+)\}/g, (m, k) => (vars && vars[k] != null ? String(vars[k]) : m));
}

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const lang = useSettings((s) => s.language);
  const [, force] = useState(0);
  const dict = cache[lang] ?? en;
  const dir = LANGUAGES.find((l) => l.id === lang)?.dir ?? 'ltr';

  useEffect(() => {
    if (!cache[lang]) preloadDictionary(lang).then(() => force((n) => n + 1));
  }, [lang]);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang, dir]);

  const t = useCallback(
    (key, vars) => {
      let v = lookup(dict, key) ?? lookup(en, key);
      if (v && typeof v === 'object' && vars?.count != null) {
        const rule = new Intl.PluralRules(lang).select(Number(vars.count));
        v = v[rule] ?? v.other;
      }
      if (typeof v !== 'string') return key;
      return vars ? interpolate(v, vars) : v;
    },
    [dict, lang],
  );

  const value = useMemo(() => ({ t, lang, dir, locale: lang }), [t, lang, dir]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n outside provider');
  return ctx;
}

/** Localized copy for an API/client error code, falling back to the server message. */
export function errorText(t, error) {
  if (!error) return '';
  const key = `errors.${error.code}`;
  const msg = t(key, { seconds: error.retryAfter ?? '', ...(error.details ?? {}) });
  if (msg !== key && !/\{\w+\}/.test(msg)) return msg;
  return error.message || t('errors.INTERNAL_ERROR');
}
