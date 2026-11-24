/** Locale-aware display helpers. Unknown values return null — never a guess. */
import { formatBytes, formatDuration } from '@ferry/shared/formats';

export const bytes = (n, opts = {}) => formatBytes(n, opts);
export const duration = (s) => formatDuration(s);

export function speed(bps, locale) {
  if (!bps || !Number.isFinite(bps)) return null;
  return `${formatBytes(bps, { locale })}/s`;
}

export function eta(sec, t) {
  if (sec == null || !Number.isFinite(sec) || sec < 0) return null;
  if (sec < 60) return t('time.seconds', { n: Math.max(1, Math.round(sec)) });
  if (sec < 3600) return t('time.minutes', { n: Math.round(sec / 60) });
  return t('time.hours', { n: Math.round((sec / 3600) * 10) / 10 });
}

export function relativeTime(date, locale) {
  const ms = new Date(date).getTime() - Date.now();
  const abs = Math.abs(ms);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  if (abs < 60_000) return rtf.format(Math.round(ms / 1000), 'second');
  if (abs < 3_600_000) return rtf.format(Math.round(ms / 60_000), 'minute');
  if (abs < 86_400_000) return rtf.format(Math.round(ms / 3_600_000), 'hour');
  return rtf.format(Math.round(ms / 86_400_000), 'day');
}

export function dayLabel(date, locale) {
  const d = new Date(date);
  const today = new Date();
  const diff = Math.round((new Date(today.toDateString()) - new Date(d.toDateString())) / 86_400_000);
  if (diff === 0 || diff === 1) return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(-diff, 'day');
  return d.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });
}

/** "12:05" or "1:02:05" → seconds; null when invalid. */
export function parseTimecode(text) {
  const s = String(text ?? '').trim();
  if (!s) return null;
  if (/^\d+(\.\d+)?$/.test(s)) return Number(s);
  const parts = s.split(':').map((p) => p.trim());
  if (parts.length > 3 || parts.some((p) => !/^\d+(\.\d+)?$/.test(p))) return NaN;
  return parts.reduce((acc, p) => acc * 60 + Number(p), 0);
}
