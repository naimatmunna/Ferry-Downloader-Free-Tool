/**
 * What people are told about a site, in one word each. Statuses come from the
 * site's *effective* policy (operator overrides included), never from how
 * reliable the extractor is: a reachable site is not an allowed one.
 *
 *   free         public-domain / open-licensed / official downloads
 *   perm         the person's own content, or with the owner's permission
 *   off          official download only (Ferry points to the site's own tools)
 *   lock         protected (DRM, paywall, sign-in)
 *   any          a website Ferry doesn't know: it will try
 *   off-server   turned off by the operator of this server
 *   unavailable  allowed, but this server lacks the engine for it
 */

const BY_POLICY = { allowed: 'free', attestation: 'perm', export_only: 'off', blocked: 'lock' };

export function siteStatus(platform) {
  if (!platform) return null;
  if (platform.policy === 'disabled') return 'off-server';
  if (platform.id === 'generic' || platform.id === 'direct') return 'any';
  const status = BY_POLICY[platform.policy] ?? 'off-server';
  if ((status === 'free' || status === 'perm') && platform.available === false) return 'unavailable';
  return status;
}

/** Home groups sites into three shelves; other statuses are listed only on Sites. */
export function shelfOf(status) {
  if (status === 'free' || status === 'perm') return 'direct';
  if (status === 'off') return 'official';
  if (status === 'lock') return 'protected';
  return null;
}

const TONES = { operational: 'ok', degraded: 'warn', failing: 'bad' };

/** Live status from `GET /api/v1/status`, or null when there is nothing honest to show. */
export function liveDot(entry) {
  const tone = entry ? TONES[entry.status] : null;
  if (!tone) return null;
  return { tone, window: entry.window, attempts: entry.attempts, successRate: entry.successRate };
}
