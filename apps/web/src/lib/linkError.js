/**
 * What the error card says when a pasted link doesn't work: a plain title,
 * what does work on that site, and the one action that helps
 * (design/link-errors-mockup.html, approved 2026-11-25).
 *
 * "Coming soon" only where Ferry could add it without signing in: pictures on
 * sites whose videos work, and websites it can't read yet. Sign-in walls say
 * so instead, because Ferry never signs in.
 */

const NOTHING_HERE = new Set(['NO_MEDIA_FOUND', 'UNSUPPORTED_PLATFORM']);
const GONE = new Set(['CONTENT_UNAVAILABLE', 'PRIVATE_CONTENT']);
const FALLBACKS = new Set(['generic', 'direct']);

/** A host as people say it: no `www.`. */
function hostName(host) {
  return typeof host === 'string' && host ? host.replace(/^www\./i, '') : null;
}

/**
 * @param {{ code: string, retryable?: boolean }} error
 * @param {{ platform?: { id: string, name: string, content?: string[], pictures?: boolean } | null, host?: string | null }} where
 * @returns {{ kind: 'pictures-soon'|'website-soon'|'signin'|'gone'|'wait'|'other', pill: 'soon'|'signin'|'gone'|'wait'|'bad',
 *   name: string|null, works: { what: 'video'|'audio'|'pictures', ok: boolean }[], primary: 'paste'|'retry', siteLink: string|null }}
 */
export function describeLinkError(error, { platform = null, host = null } = {}) {
  const known = platform && !FALLBACKS.has(platform.id) ? platform : null;
  const name = known?.name ?? hostName(host);
  const card = (kind, pill, extra = {}) => ({ kind, pill, name, works: [], primary: 'paste', siteLink: known?.id ?? null, ...extra });
  const content = known?.content ?? [];

  if (NOTHING_HERE.has(error.code)) {
    if (!known) return card('website-soon', 'soon');
    // Only on a site whose videos really work here (not one this server lacks the tool for).
    if (content.includes('image') && known.pictures === false && known.available !== false) {
      const works = [];
      if (content.includes('video')) works.push({ what: 'video', ok: true });
      else if (content.includes('audio')) works.push({ what: 'audio', ok: true });
      works.push({ what: 'pictures', ok: false });
      return card('pictures-soon', 'soon', { works });
    }
  }
  if (error.code === 'AUTH_REQUIRED') return card('signin', 'signin');
  if (GONE.has(error.code)) return card('gone', 'gone');
  if (error.retryable) return card(NOTHING_HERE.has(error.code) ? 'other' : 'wait', 'wait', { primary: 'retry' });
  return card('other', 'bad');
}
