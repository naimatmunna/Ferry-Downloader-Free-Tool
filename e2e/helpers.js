import { execFileSync } from 'node:child_process';
import { expect } from '@playwright/test';

export const FIXTURES = `http://127.0.0.1:${Number(process.env.E2E_PORT ?? 8788) + 110}`;

/** Fresh state for every test: no settings, history or tracked jobs; auto-save off. */
export async function freshApp(page) {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('ferry:e2e-initialized')) return;
    sessionStorage.setItem('ferry:e2e-initialized', '1');
    for (const k of Object.keys(localStorage)) if (k.startsWith('ferry:')) localStorage.removeItem(k);
    localStorage.setItem('ferry:settings:v1', JSON.stringify({ state: { autoSave: false, language: 'en', theme: 'light' }, version: 1 }));
  });
  await page.goto('/');
}

export async function analyze(page, url) {
  const field = page.getByLabel('Link to a video, song or podcast');
  await field.fill(url);
  await page.getByRole('button', { name: 'Find media' }).click();
}

export async function confirmRights(page) {
  const box = page.getByRole('checkbox', { name: /I have the right to download|I own this content/ });
  if (await box.isVisible()) await box.check();
}

/** Wait on the Downloads page until the newest job is ready. */
export async function waitReady(page) {
  await page.getByRole('link', { name: /^Downloads/ }).first().click();
  await expect(page.getByRole('heading', { name: 'Downloads' })).toBeVisible();
  await expect(page.getByRole('main').getByRole('button', { name: /^Save/ }).first()).toBeVisible({ timeout: 90_000 });
}

/** Click Save, capture the browser download, and describe its streams with ffprobe. */
export async function saveAndProbe(page) {
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('main').getByRole('button', { name: /^Save/ }).first().click()]);
  const file = await download.path();
  const json = JSON.parse(execFileSync(process.env.FFPROBE_PATH || 'ffprobe', ['-v', 'error', '-print_format', 'json', '-show_streams', '-show_format', file], { encoding: 'utf8' }));
  return { name: download.suggestedFilename(), streams: json.streams.map((s) => [s.codec_type, s.codec_name]), format: json.format.format_name };
}
