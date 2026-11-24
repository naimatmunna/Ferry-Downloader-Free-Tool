/**
 * Copy lookup. Ferry is English only; keeping every string in `en.js` keeps
 * wording consistent ("Save" stays "Save" from button to toast) and easy to edit.
 */
import { createContext, useCallback, useContext, useMemo } from 'react';
import en from './en.js';

const LOCALE = 'en';
const plural = new Intl.PluralRules(LOCALE);

function lookup(dict, key) {
  return key.split('.').reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), dict);
}

function interpolate(str, vars) {
  return str.replace(/\{(\w+)\}/g, (m, k) => (vars && vars[k] != null ? String(vars[k]) : m));
}

/** Plain lookup, usable outside React (stores, helpers). */
export function translate(key, vars) {
  let v = lookup(en, key);
  if (v && typeof v === 'object' && vars?.count != null) v = v[plural.select(Number(vars.count))] ?? v.other;
  if (typeof v !== 'string') return key;
  return vars ? interpolate(v, vars) : v;
}

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const t = useCallback((key, vars) => translate(key, vars), []);
  const value = useMemo(() => ({ t, lang: LOCALE, locale: LOCALE }), [t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n outside provider');
  return ctx;
}

/** Copy for an API/client error code, falling back to the server message. */
export function errorText(t, error) {
  if (!error) return '';
  const key = `errors.${error.code}`;
  const msg = t(key, { seconds: error.retryAfter ?? '', ...(error.details ?? {}) });
  if (msg !== key && !/\{\w+\}/.test(msg)) return msg;
  return error.message || t('errors.INTERNAL_ERROR');
}
