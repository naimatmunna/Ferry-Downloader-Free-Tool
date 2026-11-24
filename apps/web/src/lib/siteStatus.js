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

/** Reliability levels that mean downloads fail most of the time, or always. */
const FAILS = new Set(['unstable', 'unsupported']);

/**
 * Whether Ferry can really download from a site: its policy allows it (free,
 * or with permission), this server has the engine, and it isn't known to fail
 * (a login wall, posing as a browser, or a broken extractor). Home and Sites
 * list only these; pasting any other link still explains what Ferry can do.
 */
export function isDownloadable(platform) {
  const status = siteStatus(platform);
  return (status === 'free' || status === 'perm') && !FAILS.has(platform.reliability);
}

/** Why a site isn't listed on Home and Sites ('broken' when it is known to fail), or null when it is. */
export function hiddenReason(platform) {
  if (!platform || isDownloadable(platform)) return null;
  const status = siteStatus(platform);
  return status === 'free' || status === 'perm' ? 'broken' : status;
}

/**
 * What Ferry does with a site by policy: downloads from it ('direct'), points
 * to the site's own download ('official'), or can't save it ('protected').
 * Other statuses (any site, turned off, not on this server) give null.
 */
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
