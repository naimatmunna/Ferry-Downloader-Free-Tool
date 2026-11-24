import { test, expect } from '@playwright/test';
import { FIXTURES, analyze, confirmRights, freshApp, saveAndProbe, waitReady } from './helpers.js';

test.beforeEach(async ({ page }) => {
  await freshApp(page);
});

test('paste a link: platform and policy are detected before anything is fetched', async ({ page }) => {
  await page.getByLabel('Link to a video, song or podcast').fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  await expect(page.locator('#gate-status')).toContainText('YouTube');
  await expect(page.locator('#gate-status')).toContainText('Official export only');
  await page.getByLabel('Link to a video, song or podcast').fill('not a link at all');
  await expect(page.locator('#gate-status')).toContainText("That doesn't look like a link yet.");
});

test('protected and export-only platforms explain the official route', async ({ page }) => {
  await analyze(page, 'https://www.netflix.com/title/80057281');
  const alert = page.getByRole('alert');
  await expect(alert).toContainText('protects its media');
  await analyze(page, 'https://youtu.be/dQw4w9WgXcQ');
  await expect(page.getByRole('alert')).toContainText('YouTube Studio');
});

test('video with sound: preview, real qualities, MP4 delivered intact', async ({ page }) => {
  await analyze(page, `${FIXTURES}/clip-h264-aac.mp4`);
  await expect(page.getByRole('heading', { name: 'clip-h264-aac' })).toBeVisible();
  await expect(page.getByText('360p', { exact: true })).toBeVisible();
  await expect(page.getByText('Nothing is re-encoded')).toBeVisible();
  const download = page.getByRole('button', { name: 'Download 360p MP4' }).first();
  await expect(download).toBeDisabled(); // rights not yet confirmed
  await confirmRights(page);
  await download.click();
  await expect(page.getByText('Added to Downloads')).toBeVisible();
  await waitReady(page);
  const out = await saveAndProbe(page);
  expect(out.name).toBe('clip-h264-aac.mp4');
  expect(out.streams).toEqual(expect.arrayContaining([['video', 'h264'], ['audio', 'aac']]));
});

test('video without sound removes the audio track', async ({ page }) => {
  await analyze(page, `${FIXTURES}/clip-h264-aac.mp4`);
  await page.getByText('Video only', { exact: true }).click();
  await page.getByText('MKV', { exact: true }).click();
  await confirmRights(page);
  await page.getByRole('button', { name: /^Download .*MKV$/ }).first().click();
  await waitReady(page);
  const out = await saveAndProbe(page);
  expect(out.name).toMatch(/\.mkv$/);
  expect(out.streams.map((s) => s[0])).toEqual(['video']);
});

test('audio only: MP3 at a chosen bitrate, with honest quality notes', async ({ page }) => {
  await analyze(page, `${FIXTURES}/clip-vp9-opus.webm`);
  await page.getByText('Audio only', { exact: true }).click();
  await expect(page.getByText('Source audio: Opus')).toBeVisible();
  await page.getByLabel('Bitrate').selectOption('128');
  await expect(page.getByText('Converted to MP3 at 128 kbps.')).toBeVisible();
  await confirmRights(page);
  await page.getByRole('button', { name: 'Download MP3' }).first().click();
  await waitReady(page);
  const out = await saveAndProbe(page);
  expect(out.name).toBe('clip-vp9-opus.mp3');
  expect(out.streams).toEqual([['audio', 'mp3']]);
});

test('a failed download can be retried', async ({ page }) => {
  await analyze(page, `${FIXTURES}/flaky-download/tone.m4a`);
  await page.getByText('Audio only', { exact: true }).click();
  await confirmRights(page);
  await page.getByRole('button', { name: /^Download/ }).first().click();
  await page.getByRole('link', { name: /^Downloads/ }).first().click();
  const main = page.getByRole('main');
  const retry = main.getByRole('button', { name: 'Retry' });
  await expect(retry).toBeVisible({ timeout: 60_000 });
  await expect(main.getByText('The transfer stopped before it finished.')).toBeVisible();
  await retry.click();
  await expect(main.getByRole('button', { name: /^Save/ })).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText('Attempt 2 of 3')).toBeVisible();
});

test('history records finished downloads and can be searched and cleared', async ({ page }) => {
  await analyze(page, `${FIXTURES}/tone.ogg`);
  await page.getByText('Audio only', { exact: true }).click();
  await confirmRights(page);
  await page.getByRole('button', { name: /^Download/ }).first().click();
  await waitReady(page);
  await page.getByRole('link', { name: 'History' }).first().click();
  await expect(page.getByRole('main').getByText('tone', { exact: true }).first()).toBeVisible();
  await page.getByPlaceholder('Search your history').fill('nothing-like-this');
  await expect(page.getByText('Nothing matches')).toBeVisible();
  await page.getByPlaceholder('Search your history').fill('');
  await page.getByRole('button', { name: 'Clear history' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Clear history' }).click();
  await expect(page.getByText('No history yet')).toBeVisible();
});

test('settings: theme and language apply immediately and persist', async ({ page }) => {
  await page.getByRole('link', { name: 'Settings' }).first().click();
  await page.getByText('Dark', { exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByLabel('Language').selectOption('ar');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('keyboard only: reach the field, analyze with Enter', async ({ page }) => {
  await page.keyboard.press('Tab'); // skip link
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.getByLabel('Link to a video, song or podcast').focus();
  await page.keyboard.type(`${FIXTURES}/tone.mp3`);
  await page.keyboard.press('Enter');
  await expect(page.getByText('Audio only', { exact: true })).toBeVisible();
});
