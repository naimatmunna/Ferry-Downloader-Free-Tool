/**
 * What a browser shows when a Save link fails. Save links are plain browser
 * downloads, and iPhone Safari saves whatever comes back: a JSON error would
 * land in Files as a .json file. Browsers get this short page instead; apps
 * (Accept: application/json, or no Accept header) still get JSON.
 */

/** Save links: a produced file, or one ZIP of all of a job's files. */
const SAVE_LINK = /^\/api\/v1\/jobs\/[^/]+\/(files\/[^/]+|archive)$/;

const COPY = {
  gone: {
    title: 'This file isn’t on the server anymore',
    body: 'Files leave the server after a while, or when the server restarts. Go back to Ferry and tap Download again.',
  },
  elsewhere: {
    title: 'This download belongs to another browser',
    body: 'Open Ferry in the browser where you started the download, or paste the link again here.',
  },
  other: {
    title: 'This file can’t be saved right now',
    body: 'Go back to Ferry and try again in a moment.',
  },
};

const KIND = { JOB_NOT_FOUND: 'gone', JOB_EXPIRED: 'gone', FORBIDDEN: 'elsewhere' };

/** Whether this failed request was a browser following a Save link (and wants a page). */
export function wantsDownloadErrorPage(req) {
  return req.method === 'GET' && SAVE_LINK.test(req.path) && req.accepts(['json', 'html']) === 'html';
}

const escape = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** @param {string} code a FerryError code */
export function downloadErrorPage(code) {
  const { title, body } = COPY[KIND[code] ?? 'other'];
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>${escape(title)} · Ferry</title>
<style>
:root { --ink: #14161a; --ink-2: #4d5360; --ink-3: #6a7180; --canvas: #f3f4f6; --primary: #14161a; --primary-ink: #fff; --mark-bg: #14161a; --mark-arrow: #ffd43b; --mark-wave: #fff; }
@media (prefers-color-scheme: dark) { :root { --ink: #f1f2f4; --ink-2: #b2b8c3; --ink-3: #878f9c; --canvas: #0e0f12; --primary: #ffd43b; --primary-ink: #14161a; --mark-bg: #ffd43b; --mark-arrow: #14161a; --mark-wave: #14161a; } }
* { box-sizing: border-box; }
body { margin: 0; min-height: 100dvh; background: var(--canvas); color: var(--ink); font: 16px/1.5 ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; }
main { max-width: 30rem; margin: 0 auto; padding: 44px 24px; display: flex; flex-direction: column; gap: 16px; }
.logo { display: flex; align-items: center; gap: 10px; font-weight: 800; font-size: 21px; }
h1 { margin: 22px 0 0; font-size: 31px; line-height: 1.08; letter-spacing: -.02em; }
p { margin: 0; color: var(--ink-2); }
a { margin-top: 8px; display: flex; align-items: center; justify-content: center; min-height: 54px; border-radius: 16px; background: var(--primary); color: var(--primary-ink); font-weight: 700; text-decoration: none; }
a:focus-visible { outline: 3px solid #2356d8; outline-offset: 3px; }
small { margin-top: 24px; font-size: 12.5px; color: var(--ink-3); }
</style>
</head>
<body>
<main>
<span class="logo"><svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="9" style="fill:var(--mark-bg)"/><path d="M16 6.5V19M10.5 13.5 16 19l5.5-5.5" style="stroke:var(--mark-arrow)" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M7 25q2.25-2.6 4.5 0t4.5 0 4.5 0 4.5 0" style="stroke:var(--mark-wave)" stroke-width="2.4" fill="none" stroke-linecap="round"/></svg>Ferry</span>
<h1>${escape(title)}</h1>
<p>${escape(body)}</p>
<a href="/downloads">Back to Ferry</a>
<small>Code: ${escape(code)}</small>
</main>
</body>
</html>
`;
}
