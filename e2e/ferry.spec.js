import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { FIXTURES, analyze, confirmRights, freshApp, saveAndProbe, waitReady, zipEntryNames } from './helpers.js';

test.beforeEach(async ({ page }) => {
  await freshApp(page);
});

test('paste a link: platform and policy are detected before anything is fetched', async ({ page }) => {
  await page.getByLabel('Link to a video, song or post').fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  await expect(page.locator('#gate-status')).toContainText('YouTube');
  await expect(page.locator('#gate-status')).toContainText('Your own or with permission');
  await page.getByLabel('Link to a video, song or post').fill('https://www.threads.com/@ferry/post/C3abcDEF123');
  await expect(page.locator('#gate-status')).toContainText('Threads');
  await expect(page.locator('#gate-status')).toContainText('Official download only');
  await page.getByLabel('Link to a video, song or post').fill('not a link at all');
  await expect(page.locator('#gate-status')).toContainText("That doesn't look like a link yet.");
});

/** Which Home shelf a site belongs to, from its effective policy (mirrors lib/siteStatus.js). */
function shelfOfPlatform(p) {
  if (p.id === 'generic' || p.id === 'direct' || p.policy === 'disabled') return null;
  if (p.policy === 'export_only') return 'official';
  if (p.policy === 'blocked') return 'protected';
  return p.available === false ? null : 'direct';
}

test('home shows where Ferry works, grouped by what each site allows', async ({ page, request }) => {
  const { platforms } = await (await request.get('/api/v1/platforms')).json();
  const count = (shelf) => {
    const n = platforms.filter((p) => shelfOfPlatform(p) === shelf).length;
    return n === 1 ? '1 site' : `${n} sites`;
  };
  const where = page.getByRole('region', { name: 'Where Ferry works' });
  const direct = where.getByRole('group', { name: 'Download directly' });
  const official = where.getByRole('group', { name: 'Official download only' });
  const protectedSites = where.getByRole('group', { name: 'Protected' });
  await expect(direct.getByRole('link', { name: /^TikTok/ })).toBeVisible();
  await expect(direct).toContainText(count('direct'));
  // The best-known sites lead the "Download directly" shelf (YouTube, Facebook and SoundCloud need a permission tick).
  for (const name of [/^YouTube:/, /^Facebook:/, /^SoundCloud:/]) await expect(direct.getByRole('link', { name })).toBeVisible();
  await expect(official.getByRole('link', { name: /^Threads/ })).toBeVisible();
  await expect(official).toContainText(count('official'));
  await expect(protectedSites.getByRole('link', { name: /^Netflix/ })).toBeVisible();
  await expect(protectedSites).toContainText(count('protected'));
  await direct.getByRole('link', { name: /^TikTok/ }).click();
  await expect(page).toHaveURL(/\/sites\?site=tiktok$/);
});

test('live status dots come from the server and say what they mean', async ({ page }) => {
  await page.route('**/api/v1/status', (route) =>
    route.fulfill({
      json: {
        platforms: {
          tiktok: { status: 'operational', window: '1h', attempts: 12, successRate: 91.7 },
          reddit: { status: 'failing', window: '24h', attempts: 5, successRate: 20 },
          vimeo: { status: 'unknown', window: '24h', attempts: 1, successRate: 100 },
          threads: { status: 'operational', window: '1h', attempts: 9, successRate: 100 },
        },
      },
    }),
  );
  await page.reload();
  const where = page.getByRole('region', { name: 'Where Ferry works' });
  // Each dot says what it means and over which window.
  await expect(where.getByRole('link', { name: /^TikTok.*Working, last hour/ })).toBeVisible();
  await expect(where.getByRole('link', { name: /^Reddit.*Failing, last 24 hours/ })).toBeVisible();
  await expect(where.getByRole('link', { name: /^Vimeo/ })).not.toHaveAccessibleName(/Working|Failing|Some links fail/);
  // Official-only and protected sites never get a dot: Ferry doesn't download from them.
  await expect(where.getByRole('link', { name: /^Threads:/ })).not.toHaveAccessibleName(/Working/);
  const field = page.getByLabel('Link to a video, song or post');
  await field.fill('https://www.tiktok.com/@harborlight/video/7431982044417805611');
  await expect(page.locator('#gate-status')).toContainText('Working, last hour');
  await field.fill('https://www.threads.com/@ferry/post/C3abcDEF123');
  await expect(page.locator('#gate-status')).toContainText('Official download only');
  await expect(page.locator('#gate-status')).not.toContainText('Working');
});

test('a site this server cannot read still shows its official links', async ({ page, request }) => {
  const { platforms } = await (await request.get('/api/v1/platforms')).json();
  const pixabay = platforms.find((p) => p.id === 'pixabay');
  await analyze(page, 'https://pixabay.com/videos/ocean-waves-12345/');
  await expect(page.getByRole('alert')).toContainText(pixabay.routes[0].label);
});

test('status endpoint down: home still renders without dots or errors', async ({ page }) => {
  await page.route('**/api/v1/status', (route) => route.abort());
  await page.reload();
  const where = page.getByRole('region', { name: 'Where Ferry works' });
  await expect(where.getByRole('link', { name: /^TikTok/ })).toBeVisible();
  await expect(where.getByRole('link', { name: /^TikTok/ })).not.toHaveAccessibleName(/Working|Failing/);
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('protected and export-only platforms explain the official route', async ({ page }) => {
  await analyze(page, 'https://www.netflix.com/title/80057281');
  const alert = page.getByRole('alert');
  await expect(alert).toContainText('protects its media');
  await analyze(page, 'https://www.threads.com/@ferry/post/C3abcDEF123');
  await expect(page.getByRole('alert')).toContainText('Download your information');
});

test('video with sound: preview, real qualities, MP4 delivered intact', async ({ page }) => {
  await analyze(page, `${FIXTURES}/clip-h264-aac.mp4`);
  await expect(page.getByRole('heading', { name: 'clip-h264-aac' })).toBeVisible();
  await expect(page.getByText('360p', { exact: true })).toBeVisible();
  // Each choice group is announced by its name.
  await expect(page.getByRole('group', { name: 'What do you want?' }).getByRole('radio', { name: /^Video \+ sound/ })).toBeChecked();
  await expect(page.getByRole('group', { name: 'Quality' }).getByRole('radio', { name: /^360p/ })).toBeChecked();
  await expect(page.getByRole('group', { name: 'Format' }).getByRole('radio', { name: /^MP4/ })).toBeChecked();
  await expect(page.getByRole('radio', { name: /^MP4 Copied, no quality loss/ })).toBeChecked();
  await expect(page.getByRole('radio', { name: /^WebM Converted/ })).toBeVisible();
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
  await page.getByRole('button', { name: /^Download .*MKV/ }).first().click();
  await waitReady(page);
  const out = await saveAndProbe(page);
  expect(out.name).toMatch(/\.mkv$/);
  expect(out.streams.map((s) => s[0])).toEqual(['video']);
});

test('audio only: MP3 at a chosen bitrate, with honest quality notes', async ({ page }) => {
  await analyze(page, `${FIXTURES}/clip-vp9-opus.webm`);
  await page.getByText('Audio only', { exact: true }).click();
  await expect(page.getByText('Source audio: Opus')).toBeVisible();
  await page.getByText('128 kbps', { exact: true }).click();
  await expect(page.getByRole('radio', { name: '128 kbps', exact: true })).toBeChecked();
  await expect(page.getByText('Converted to MP3 at 128 kbps.')).toBeVisible();
  await confirmRights(page);
  await page.getByRole('button', { name: 'Download MP3' }).first().click();
  await waitReady(page);
  const out = await saveAndProbe(page);
  expect(out.name).toBe('clip-vp9-opus.mp3');
  expect(out.streams).toEqual([['audio', 'mp3']]);
});

test('image gallery: preview grid, pick images, one ZIP of re-encoded files', async ({ page }) => {
  // A Mastodon post (fixture API) with four images and a video.
  await analyze(page, `${FIXTURES}/@ferry/111111111`);
  await expect(page.getByRole('heading', { name: 'Harbour pictures & a clip' })).toBeVisible({ timeout: 90_000 }); // gallery-dl can take a while to read the page
  await expect(page.getByText('1 video in this post isn’t included.')).toBeVisible();
  await expect(page.getByRole('checkbox', { name: /^Image \d+,/ })).toHaveCount(4);
  // Previews come through Ferry's signed thumbnail proxy and really load.
  const firstPreview = page.locator('label', { has: page.getByRole('checkbox', { name: /^Image 1,/ }) }).locator('img');
  await expect.poll(() => firstPreview.evaluate((img) => (img.complete ? img.naturalWidth : 0))).toBeGreaterThan(0);

  await page.getByRole('button', { name: 'Clear selection' }).click();
  await expect(page.getByRole('button', { name: 'Download 0 images' }).first()).toBeDisabled();
  await page.getByRole('button', { name: 'Select all' }).click();
  await page.getByRole('checkbox', { name: /^Image 2,/ }).uncheck();
  const download = page.getByRole('button', { name: 'Download 3 images' }).first();
  await expect(download).toBeDisabled(); // rights not yet confirmed
  await confirmRights(page);
  await download.click();
  await expect(page.getByText('Added to Downloads')).toBeVisible();

  await waitReady(page);
  // The "ready" notice saves the whole gallery, not just its first image.
  const notice = page.getByRole('status').filter({ hasText: 'Harbour pictures & a clip is ready' });
  const [fromNotice] = await Promise.all([page.waitForEvent('download'), notice.getByRole('button', { name: 'Save' }).click()]);
  expect(fromNotice.suggestedFilename()).toBe('Harbour pictures & a clip.zip');

  const main = page.getByRole('main');
  await expect(main.getByRole('button', { name: 'Image 1' })).toBeVisible();
  const [zip] = await Promise.all([page.waitForEvent('download'), main.getByRole('button', { name: 'Save all as ZIP' }).click()]);
  expect(zip.suggestedFilename()).toBe('Harbour pictures & a clip.zip');
  expect(zipEntryNames(readFileSync(await zip.path()))).toEqual([
    'Harbour pictures & a clip - 01.jpg',
    'Harbour pictures & a clip - 03.gif',
    'Harbour pictures & a clip - 05.jpg',
  ]);
});

test('a failed download can be retried', async ({ page }) => {
  await analyze(page, `${FIXTURES}/flaky-download/tone.m4a`);
  await page.getByText('Audio only', { exact: true }).click();
  await confirmRights(page);
  await page.getByRole('button', { name: /^Download/ }).first().click();
  await page.getByRole('link', { name: /^Downloads/ }).first().click();
  const main = page.getByRole('main');
  const retry = main.getByRole('button', { name: 'Try again' });
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
  await page.getByRole('dialog', { name: 'Clear history' }).getByRole('button', { name: 'Clear history' }).click();
  await expect(page.getByText('No history yet')).toBeVisible();
});

test('settings: the theme applies immediately and persists; the app is English only', async ({ page }) => {
  await page.getByRole('link', { name: 'Settings' }).first().click();
  await expect(page.getByLabel('Language')).toHaveCount(0);
  await page.getByText('Dark', { exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('html')).not.toHaveAttribute('dir', 'rtl');
});

test('sites: search, filter, logos and official routes', async ({ page }) => {
  await page.getByRole('link', { name: 'Sites' }).first().click();
  await expect(page.getByRole('heading', { name: 'Sites', level: 1 })).toBeVisible();
  const search = page.getByRole('searchbox', { name: 'Search sites' });
  await search.fill('youtu');
  await page.getByRole('button', { name: /^YouTube Your own or with permission/ }).click();
  const detail = page.getByRole('region', { name: 'YouTube' });
  // Keyboard users land on the detail right away instead of tabbing past every card.
  await expect(detail.getByRole('heading', { name: 'YouTube', level: 2 })).toBeFocused();
  await expect(detail).toContainText('YouTube Studio');
  await search.fill('');
  await page.getByRole('button', { name: /^Protected \d+/ }).click();
  await expect(page.getByRole('button', { name: /^Netflix\b/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /^TikTok\b/ })).toHaveCount(0);
  // A site without a logo in Simple Icons gets a letter tile, never an empty square.
  await page.getByRole('button', { name: /^All \d+/ }).click();
  await search.fill('linkedin');
  await expect(page.getByRole('button', { name: /^LinkedIn Your own or with permission/ }).locator('[data-monogram]')).toHaveText('L');
});

test('sites: a Home logo opens that site on the Sites page', async ({ page }) => {
  await page.getByRole('region', { name: 'Where Ferry works' }).getByRole('link', { name: /^Vimeo/ }).click();
  await expect(page.getByRole('region', { name: 'Vimeo' })).toBeVisible();
  // The detail comes before the long list of cards in keyboard order.
  const detailFirst = await page.evaluate(() => {
    const detail = document.querySelector('[aria-labelledby="site-detail"]');
    const firstCard = document.querySelector('main ul button');
    return Boolean(detail.compareDocumentPosition(firstCard) & Node.DOCUMENT_POSITION_FOLLOWING);
  });
  expect(detailFirst).toBe(true);
});

test('a video with extra files (the thumbnail) can be saved as one ZIP', async ({ page }) => {
  await analyze(page, `${FIXTURES}/page.html`);
  await expect(page.getByRole('heading', { name: 'Your file' })).toBeVisible({ timeout: 90_000 }); // reading a whole page can take a while
  await confirmRights(page);
  await page.getByText('More options').first().click();
  await page.getByRole('switch', { name: 'Save the thumbnail image too' }).check();
  await page.getByRole('button', { name: /^Download/ }).first().click();
  await waitReady(page);
  await expect(page.getByRole('main').getByRole('button', { name: 'Save all as ZIP' })).toBeVisible();
});

test('downloads waiting on this device are sent after a reload', async ({ page }) => {
  await page.evaluate(() =>
    localStorage.setItem(
      'ferry:downloads:v1',
      JSON.stringify({ state: { tracked: {}, jobs: {}, queue: [{ body: { probeId: 'p_gone', mode: 'audio', attest: false }, meta: { title: 'Waiting clip' } }] }, version: 1 }),
    ),
  );
  await page.goto('/downloads');
  await expect(page.getByRole('heading', { name: 'Downloads', level: 1 })).toBeVisible();
  // The server refuses the stale request, so it leaves the waiting list instead of waiting forever.
  await expect(page.getByText('Waiting clip')).toHaveCount(0, { timeout: 15_000 });
});

test('downloads survive a page reload', async ({ page }) => {
  await analyze(page, `${FIXTURES}/tone.ogg`);
  await page.getByText('Audio only', { exact: true }).click();
  await confirmRights(page);
  await page.getByRole('button', { name: /^Download/ }).first().click();
  await expect(page.getByText('Added to Downloads')).toBeVisible();
  await page.getByRole('link', { name: /^Downloads/ }).first().click();
  await expect(page.getByRole('main').getByRole('heading', { name: 'tone' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('main').getByRole('heading', { name: 'tone' })).toBeVisible();
  await expect(page.getByRole('main').getByRole('button', { name: /^Save/ })).toBeVisible({ timeout: 90_000 });
});

test('keyboard only: reach the field, analyze with Enter', async ({ page }) => {
  await page.keyboard.press('Tab'); // skip link
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.getByLabel('Link to a video, song or post').focus();
  await page.keyboard.type(`${FIXTURES}/tone.mp3`);
  await page.keyboard.press('Enter');
  await expect(page.getByText('Audio only', { exact: true })).toBeVisible();
});
