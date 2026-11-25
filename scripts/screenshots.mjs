#!/usr/bin/env node
/**
 * README screenshots → docs/screenshots/*.png
 *
 * Starts the local test stack (scripts/e2e-server.mjs: the built web app plus
 * self-authored fixture media, so no third-party content appears) and drives it
 * with Playwright in Microsoft Edge (PW_CHANNEL=chrome for Chrome).
 *
 *   npm run build && node scripts/screenshots.mjs
 *
 * The "link didn't work" shot reads https://example.com/ and is skipped offline.
 */
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';
import { chromium } from '@playwright/test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'docs', 'screenshots');
const PORT = Number(process.env.SHOTS_PORT ?? 8791);
const base = `http://127.0.0.1:${PORT}`;
const fixtures = `http://127.0.0.1:${PORT + 110}`;
mkdirSync(out, { recursive: true });

const server = spawn(process.execPath, [path.join(root, 'scripts', 'e2e-server.mjs')], {
  cwd: root,
  env: { ...process.env, PORT: String(PORT), FIXTURE_PORT: String(PORT + 110), LOG_LEVEL: 'warn' },
  stdio: ['ignore', 'inherit', 'inherit'],
});

async function ready() {
  for (let i = 0; i < 120; i += 1) {
    try {
      if ((await fetch(`${base}/readyz`)).ok) return;
    } catch {
      /* not up yet */
    }
    await sleep(500);
  }
  throw new Error('test stack did not start');
}

/** A page with fresh settings in the given theme. */
async function open(browser, { theme = 'light', viewport = { width: 1280, height: 820 }, mobile = false } = {}) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 2, isMobile: mobile, hasTouch: mobile, colorScheme: theme, reducedMotion: 'reduce' });
  await context.addInitScript((t) => {
    for (const k of Object.keys(localStorage)) if (k.startsWith('ferry:')) localStorage.removeItem(k);
    localStorage.setItem('ferry:settings:v1', JSON.stringify({ state: { autoSave: false, language: 'en', theme: t }, version: 1 }));
  }, theme);
  const page = await context.newPage();
  await page.goto(base);
  await page.getByLabel('Link to a video, song or post').waitFor();
  return page;
}

async function analyze(page, url) {
  await page.getByLabel('Link to a video, song or post').fill(url);
  await page.getByRole('button', { name: 'Find media' }).click();
}

async function shot(page, name, target) {
  if (target) await target.scrollIntoViewIfNeeded();
  await sleep(600); // previews and fonts settle
  await page.screenshot({ path: path.join(out, `${name}.png`) });
  console.log(`wrote docs/screenshots/${name}.png`);
}

/** The page from the link box down to the questions section: the pasted link and its result. */
async function shotResult(page, name) {
  await sleep(800);
  const top = (await page.getByLabel('Link to a video, song or post').boundingBox()).y - 24;
  const faq = await page.getByRole('heading', { name: /Frequently/ }).boundingBox();
  const scrollY = await page.evaluate(() => window.scrollY);
  const y = Math.max(0, top + scrollY);
  const bottom = faq.y + scrollY - 40;
  await page.screenshot({ path: path.join(out, `${name}.png`), fullPage: true, clip: { x: 0, y, width: page.viewportSize().width, height: bottom - y } });
  console.log(`wrote docs/screenshots/${name}.png`);
}

let browser;
try {
  await ready();
  browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? 'msedge' });

  // 1. Home
  const home = await open(browser);
  await shot(home, 'home');

  // 2. A video: real qualities and formats
  await analyze(home, `${fixtures}/clip-h264-aac.mp4`);
  const formats = home.getByRole('button', { name: /^Download/ }).first();
  await formats.waitFor({ timeout: 60_000 });
  await shotResult(home, 'video');

  // 3. A picture post (fixture Mastodon status with four images and a clip)
  const gallery = await open(browser);
  await analyze(gallery, `${fixtures}/@ferry/111111111`);
  const heading = gallery.getByRole('heading', { name: 'Harbour pictures & a clip' });
  await heading.waitFor({ timeout: 90_000 });
  await shotResult(gallery, 'gallery');

  // 4. Downloads, after saving three of the pictures
  await gallery.getByRole('checkbox', { name: /^Image 2,/ }).uncheck();
  const box = gallery.getByRole('checkbox', { name: /my content, or I have permission/ });
  if (await box.isVisible()) await box.check();
  await gallery.getByRole('button', { name: 'Download 3 images' }).first().click();
  await gallery.getByRole('link', { name: /^Downloads/ }).first().click();
  await gallery.getByRole('main').getByRole('button', { name: /^Save/ }).first().waitFor({ timeout: 90_000 });
  await sleep(500);
  const notices = gallery.getByRole('button', { name: 'Dismiss' });
  while (await notices.count()) await notices.first().click(); // the "Added" and "ready" notices
  await shot(gallery, 'downloads');

  // 5. Sites
  const sites = await open(browser);
  await sites.goto(`${base}/sites`);
  await sites.getByRole('heading', { level: 1 }).waitFor();
  await shot(sites, 'sites');

  // 6. A link that doesn't work (needs the internet)
  try {
    const error = await open(browser);
    await analyze(error, 'https://example.com/');
    const card = error.getByRole('alert');
    await card.waitFor({ timeout: 60_000 });
    await shotResult(error, 'link-error');
  } catch (err) {
    console.warn(`skipped link-error.png (${err.message.split('\n')[0]})`);
  }

  // 7. Phone, dark
  const phone = await open(browser, { theme: 'dark', viewport: { width: 390, height: 844 }, mobile: true });
  await shot(phone, 'phone-dark');
} finally {
  await browser?.close();
  server.kill();
}
