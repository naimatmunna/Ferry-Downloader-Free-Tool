/** Browser capability checks that change behaviour (see docs/research web_platform_mobile_ux). */

const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent;

export const isIOS = /iP(hone|ad|od)/.test(ua) || (ua.includes('Macintosh') && typeof document !== 'undefined' && 'ontouchend' in document);

export function isStandalone() {
  try {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  } catch {
    return false;
  }
}

/**
 * iOS Home Screen web apps get stuck on downloads (WebKit bug 290847), so
 * Ferry opens files in Safari there instead of downloading in place.
 */
export const needsExternalDownload = () => isIOS && isStandalone();

export const canReadClipboard = () => typeof navigator !== 'undefined' && Boolean(navigator.clipboard?.readText) && window.isSecureContext;

export const prefersReducedMotion = () => {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
};
