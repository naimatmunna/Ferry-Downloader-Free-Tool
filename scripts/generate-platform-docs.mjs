#!/usr/bin/env node
/**
 * Generate docs/PLATFORM-COMPATIBILITY.md from the platform registry, so the
 * documentation and the code can never disagree.   npm run docs:platforms
 */
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CATALOG, CATALOG_VERSION } from '../packages/shared/src/platforms/catalog.js';
import { CATEGORIES } from '../packages/shared/src/platforms/policy.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'docs', 'PLATFORM-COMPATIBILITY.md');

const POLICY_TEXT = {
  allowed: 'Downloads allowed',
  attestation: 'Own/licensed content only (user confirms)',
  export_only: 'Official download/export only — Ferry links to it',
  blocked: 'Not supported (protected)',
  disabled: 'Turned off',
};
const ENGINE_TEXT = {
  'yt-dlp': 'yt-dlp',
  'internet-archive-api': 'Internet Archive Metadata API',
  'peertube-api': 'PeerTube REST API',
  'gallery-dl': 'gallery-dl',
  streamlink: 'Streamlink (planned adapter)',
  direct: 'Direct HTTP',
  none: '—',
};
const VIDEO_OUT = 'MP4, WebM, MKV, MOV, AVI';
const AUDIO_OUT = 'MP3, M4A, AAC, WAV, FLAC, Opus, OGG';
const IMAGE_OUT = 'Images: JPEG, PNG, GIF (re-encoded, metadata removed; several as one ZIP)';

const esc = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');

function outputs(p) {
  if (!['allowed', 'attestation'].includes(p.policy)) return '—';
  if (p.engine === 'gallery-dl') return p.auth === 'always' ? '— (needs a sign-in)' : IMAGE_OUT;
  if (['streamlink', 'none'].includes(p.engine)) return '— (engine not installed)';
  const parts = [];
  if (p.content.includes('video')) parts.push(`${VIDEO_OUT}; audio: ${AUDIO_OUT}`);
  else if (p.content.includes('audio')) parts.push(AUDIO_OUT);
  return parts.join(' ') || '—';
}

function publicUrls(p) {
  if (p.engine === 'none' || p.policy === 'blocked') return 'No';
  if (p.auth === 'always') return 'No (sign-in)';
  if (p.auth === 'sometimes') return 'Yes, except sign-in-only items';
  return 'Yes';
}

const real = CATALOG.filter((p) => p.id !== 'generic' && p.id !== 'direct');
const byCategory = (c) => real.filter((p) => p.category === c);
const byPolicy = (pol) => real.filter((p) => p.policy === pol).length;

let md = `# Platform Compatibility — Ferry

> Generated from \`packages/shared/src/platforms/catalog.js\` (registry version **${CATALOG_VERSION}**) by
> \`npm run docs:platforms\`. Do not edit by hand. Sources for every entry are in the catalog and in
> \`docs/research/research_notes/\`. This is engineering documentation, not legal advice.

**${real.length} distinct platforms** (aliases, short links and sub-extractors are folded into one entry),
plus two fallbacks: *Direct media link* and *Other website*.

| Policy | Platforms |
|---|---|
| Downloads allowed | ${byPolicy('allowed')} |
| Own/licensed content only (attestation) | ${byPolicy('attestation')} |
| Official export only | ${byPolicy('export_only')} |
| Protected / not supported | ${byPolicy('blocked')} |

Policies can be changed at runtime by the operator (admin API or \`DATA_DIR/policy-overrides.json\`)
without a deployment; \`GET /api/v1/platforms\` always returns the effective values.

## The five categories

| # | Category | Default behaviour | Platforms |
|---|---|---|---|
${[1, 2, 3, 4, 5].map((c) => `| ${c} | ${CATEGORIES[c].label} | ${POLICY_TEXT[CATEGORIES[c].defaultPolicy]} | ${byCategory(c).length} |`).join('\n')}

Being technically extractable never makes a platform "authorized": category 4 platforms require the
user to confirm they own the content or have the rights holder's permission, and their official
routes are always shown. YouTube is category 2 by default (official export routes only) because its
terms and API policies prohibit downloading and courts in the US and Germany have treated its
signature cipher as a technical protection measure — see \`RESEARCH.md\`.

## Reliability scale

* **verified** — working extractor/API, no recurring breakage known on ${CATALOG_VERSION}
* **experimental** — works, but breaks periodically or often needs sign-in
* **unstable** — frequently broken upstream
* **unsupported** — no working engine path (DRM, defunct, no extractor, or engine not installed)

Live per-platform success rates (last 24 h, aggregate counts only) are served by \`GET /api/v1/status\`
and shown on the in-app Sites page.
`;

for (const c of [1, 2, 3, 4, 5]) {
  const list = byCategory(c).sort((a, b) => a.name.localeCompare(b.name));
  md += `\n## ${c}. ${CATEGORIES[c].label} (${list.length})\n\n`;
  md += '| Platform | Content types | Public URL support | Official API | Extraction engine | Authentication | Download support | Output formats | Restrictions | Reliability | Last checked |\n';
  md += '|---|---|---|---|---|---|---|---|---|---|---|\n';
  for (const p of list) {
    const routes = p.routes?.length ? ` Official: ${p.routes.map((r) => (r.url ? `[${esc(r.label)}](${r.url})` : esc(r.label))).join('; ')}.` : '';
    md += `| **${esc(p.name)}**<br><sub>${esc(p.hosts.slice(0, 3).join(', ') || 'detected by URL pattern')}</sub> | ${esc(p.content.join(', '))} | ${publicUrls(p)} | ${esc(p.officialApi ?? '—')} | ${ENGINE_TEXT[p.engine]} | ${p.auth} | ${POLICY_TEXT[p.policy]}.${routes} | ${outputs(p)} | ${esc(p.restrictions)} | ${p.reliability} | ${p.lastChecked} |\n`;
  }
}

md += `\n## Fallbacks\n\n| Entry | Behaviour |\n|---|---|\n| Direct media link | Any \`http(s)\` URL ending in a media extension. Probed with a ranged request + ffprobe; attestation required (rights unknown). |\n| Other website | yt-dlp's generic extractor (embedded players, HLS/DASH manifests). Attestation required; the strictest policy of the platform actually reached (embeds, redirects) is re-applied after extraction. |\n`;

writeFileSync(out, md);
console.log(`wrote ${path.relative(root, out)} (${real.length} platforms)`);
