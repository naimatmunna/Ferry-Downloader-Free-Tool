#!/usr/bin/env node
/**
 * Site logos for the web app, vendored from Simple Icons (CC0 1.0).
 *
 *   node scripts/make-brand-icons.mjs
 *
 * Writes two plain modules (committed, so builds never touch the network):
 *   apps/web/src/lib/brands/featured.js  sites shown on Home (main bundle)
 *   apps/web/src/lib/brands/all.js       every other catalog site with a logo (lazy)
 *
 * Only SVG path data is kept, and only when it matches a strict pattern, so
 * nothing executable can come through. Run again when the catalog changes.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { CATALOG } from '../packages/shared/src/platforms/catalog.js';

const VERSION = '16.37.0';
const BASE = `https://cdn.jsdelivr.net/npm/simple-icons@${VERSION}`;
const OUT = new URL('../apps/web/src/lib/brands/', import.meta.url);
const PATH = /^[MmZzLlHhVvCcSsQqTtAa0-9.,\-\s eE]+$/;
const WHITE = '#FFFFFF';
const BLACK = '#000000';

/** Catalog id → Simple Icons slug where dropping the dashes isn't enough. */
const SLUGS = {
  weibo: 'sinaweibo',
  'apple-tv-plus': 'appletv',
  'hbo-max': 'hbomax',
  'youtube-music': 'youtubemusic',
};
const SKIP = new Set(['generic', 'direct']);

/**
 * Hand-tuned tiles for the sites on Home (the mockup's `.b-*` rules). Light
 * tiles are logos drawn as a filled shape with cut-outs (YouTube, Facebook…),
 * which only read correctly as coloured glyphs on white.
 */
const FEATURED = {
  tiktok: { bg: BLACK, fg: WHITE, fx: 'tiktok', accent: '#FE2C55' },
  instagram: { bg: 'radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285aeb 90%)', fg: WHITE, accent: '#E1306C' },
  x: { bg: BLACK, fg: WHITE, accent: null },
  vimeo: { bg: '#1AB7EA', fg: WHITE },
  twitch: { bg: '#9146FF', fg: WHITE },
  reddit: { bg: '#FF4500', fg: WHITE },
  pinterest: { bg: WHITE, fg: '#E60023', light: true, accent: '#E60023' },
  bluesky: { bg: '#1185FE', fg: WHITE },
  dailymotion: { bg: WHITE, fg: '#0A0A0A', light: true, accent: null },
  tumblr: { bg: '#001935', fg: WHITE, accent: null },
  'internet-archive': { bg: WHITE, fg: BLACK, light: true, accent: null },
  peertube: { bg: '#F1680D', fg: WHITE },
  flickr: { bg: WHITE, fg: '#0063DC', light: true, accent: '#0063DC' },
  imgur: { bg: '#1BB76E', fg: WHITE },
  youtube: { bg: WHITE, fg: '#FF0000', light: true, accent: '#FF0000' },
  facebook: { bg: WHITE, fg: '#0866FF', light: true, accent: '#0866FF' },
  soundcloud: { bg: '#FF5500', fg: WHITE },
  bandcamp: { bg: '#408294', fg: WHITE },
  threads: { bg: BLACK, fg: WHITE, accent: null },
  snapchat: { bg: '#FFFC00', fg: WHITE, fx: 'outline', accent: null },
  vk: { bg: '#0077FF', fg: WHITE },
  netflix: { bg: BLACK, fg: '#E50914', accent: '#E50914' },
  spotify: { bg: BLACK, fg: '#1ED760', accent: '#1ED760' },
  'apple-music': { bg: 'linear-gradient(180deg, #FB5C74, #FA233B)', fg: WHITE, accent: '#FA243C' },
  tidal: { bg: BLACK, fg: WHITE, accent: null },
  deezer: { bg: '#A238FF', fg: WHITE },
  'hbo-max': { bg: BLACK, fg: WHITE, accent: null },
  kick: { bg: '#53FC19', fg: BLACK },
  rumble: { bg: '#85C742', fg: WHITE },
  bilibili: { bg: '#00A1D6', fg: WHITE },
  mastodon: { bg: '#6364FF', fg: WHITE },
  ted: { bg: '#E62B1E', fg: WHITE },
  nasa: { bg: WHITE, fg: '#E03C31', light: true, accent: '#E03C31' },
  'wikimedia-commons': { bg: '#006699', fg: WHITE },
};

/** WCAG relative luminance of a #RRGGBB colour. */
function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** A brand colour that reads as a progress bar on both themes, or null (ink is used). */
const accentOf = (hex) => {
  const l = luminance(hex);
  return l >= 0.06 && l <= 0.6 ? hex : null;
};

function titleToSlug(title) {
  return title
    .toLowerCase()
    .replace(/\+/g, 'plus')
    .replace(/\./g, 'dot')
    .replace(/&/g, 'and')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res.json();
}

async function getPath(slug) {
  const res = await fetch(`${BASE}/icons/${slug}.svg`);
  if (!res.ok) return null;
  const d = (await res.text()).match(/<path[^>]*\sd="([^"]+)"/)?.[1];
  return d && PATH.test(d) ? d : null;
}

/** Run `fn` over `items` with at most `n` in flight. */
async function pool(items, n, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: n }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    }),
  );
  return out;
}

const raw = await getJson(`${BASE}/data/simple-icons.json`);
const data = Array.isArray(raw) ? raw : raw.icons;
const bySlug = new Map(data.map((i) => [i.slug ?? titleToSlug(i.title), i]));

const wanted = CATALOG.filter((p) => !SKIP.has(p.id)).map((p) => ({ id: p.id, name: p.name, slug: SLUGS[p.id] ?? p.id.replace(/-/g, '') }));
const matched = wanted.filter((w) => bySlug.has(w.slug));
const unmatched = wanted.filter((w) => !bySlug.has(w.slug));
const paths = await pool(matched, 8, (w) => getPath(w.slug));

const featured = {};
const rest = {};
const failed = [];
matched.forEach((w, i) => {
  const path = paths[i];
  if (!path) return void failed.push(w.id);
  const meta = bySlug.get(w.slug);
  const hex = `#${meta.hex.toUpperCase()}`;
  const style = FEATURED[w.id];
  if (style) {
    featured[w.id] = { title: meta.title, path, bg: style.bg, fg: style.fg, ...(style.light ? { light: true } : {}), accent: 'accent' in style ? style.accent : accentOf(style.bg.startsWith('#') ? style.bg : hex), ...(style.fx ? { fx: style.fx } : {}) };
  } else {
    const l = luminance(hex);
    rest[w.id] = { title: meta.title, path, bg: hex, fg: l < 0.45 ? WHITE : BLACK, ...(l > 0.85 ? { light: true } : {}), accent: accentOf(hex) };
  }
});

const missingFeatured = Object.keys(FEATURED).filter((id) => !featured[id]);
if (missingFeatured.length) throw new Error(`featured sites without a logo: ${missingFeatured.join(', ')}`);

const header = (what) =>
  [
    '// Generated by scripts/make-brand-icons.mjs. Do not edit by hand.',
    `// ${what}`,
    `// Logos: Simple Icons ${VERSION} (CC0 1.0, https://simpleicons.org). They are trademarks of`,
    '// their owners and appear only to name each site.',
  ].join('\n');

function moduleText(what, icons) {
  const lines = Object.keys(icons)
    .sort()
    .map((id) => `  ${JSON.stringify(id)}: ${JSON.stringify(icons[id])},`);
  return `${header(what)}\nexport const ICONS = {\n${lines.join('\n')}\n};\n`;
}

await mkdir(OUT, { recursive: true });
await writeFile(new URL('featured.js', OUT), moduleText('Sites shown on Home: part of the main bundle.', featured));
await writeFile(new URL('all.js', OUT), moduleText('Every other catalog site with a logo: loaded on demand.', rest));

console.log(`featured: ${Object.keys(featured).length}, others: ${Object.keys(rest).length}, no logo: ${unmatched.length + failed.length}`);
console.log('matched:', matched.filter((w) => !failed.includes(w.id)).map((w) => `${w.id}=${bySlug.get(w.slug).title}`).join(', '));
console.log('no logo:', [...unmatched.map((w) => w.id), ...failed].join(', '));
