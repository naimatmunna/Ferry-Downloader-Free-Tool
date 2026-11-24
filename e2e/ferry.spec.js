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

/**
 * Whether Ferry can download from a site (mirrors isDownloadable in lib/siteStatus.js): its effective
 * policy allows it, this server has the engine, and it isn't known to fail. Only these are on Home and Sites.
 */
function downloadable(p) {
  if (p.id === 'generic' || p.id === 'direct') return false;
  if (p.policy !== 'allowed' && p.policy !== 'attestation') return false;
  return p.available !== false && p.reliability !== 'unstable' && p.reliability !== 'unsupported';
}

test('home shows where Ferry works: one group, only sites it can download from', async ({ page, request }) => {
  const { platforms } = await (await request.get('/api/v1/platforms')).json();
  const listed = platforms.filter(downloadable);
  const sites = `${listed.length} sites`;
  const where = page.getByRole('region', { name: 'Where Ferry works' });
  await expect(where.getByRole('link', { name: /^TikTok:/ })).toBeVisible();
  // One group: the "Download directly", "Official download only" and "Protected" shelves are gone.
  await expect(where).not.toContainText(/Download directly|Official download only|Protected/);
  // The sentence under the headline, the panel and its "See all" link count the same sites.
  await expect(page.getByText(`Save video, sound or pictures from ${sites}, in the format and quality you choose.`)).toBeVisible();
  await expect(where.getByText(sites, { exact: true })).toBeVisible();
  await expect(where.getByRole('link', { name: `See all ${sites}` })).toBeVisible();
  // 20 logos and a "more" tile on wide screens, and every logo is a site Ferry can download from.
  const logos = where.getByRole('link', { name: /^[^:]+: / });
  await expect(logos).toHaveCount(20);
  const names = listed.map((p) => p.name);
  for (const label of await logos.evaluateAll((els) => els.map((el) => el.getAttribute('aria-label')))) {
    expect(names, label).toContain(label.split(':')[0]);
  }
  await expect(where.getByRole('link', { name: `${listed.length - 20} more sites` })).toBeVisible();
  // The best-known sites lead (YouTube, Facebook and SoundCloud need a permission tick).
  for (const name of [/^YouTube: Your own or with permission/, /^Facebook:/, /^SoundCloud:/]) await expect(where.getByRole('link', { name })).toBeVisible();
  // Official-only (Threads), protected (Netflix) and failing sites (Reddit, Vimeo) aren't shown.
  for (const name of [/^Threads:/, /^Netflix:/, /^Reddit:/, /^Vimeo:/]) await expect(where.getByRole('link', { name })).toHaveCount(0);
  await where.getByRole('link', { name: /^TikTok:/ }).click();
  await expect(page).toHaveURL(/\/sites\?site=tiktok$/);
  // A direct link still opens a site that isn't listed, with its own way to download.
  const threads = platforms.find((p) => p.id === 'threads');
  await page.goto('/sites?site=threads');
  const detail = page.getByRole('region', { name: 'Threads' });
  await expect(detail.getByRole('heading', { name: 'Threads', level: 2 })).toBeVisible();
  await expect(detail).toContainText('Official download only');
  await expect(detail.getByRole('link', { name: threads.routes[0].label })).toBeVisible();
});

test('live status dots come from the server and say what they mean', async ({ page }) => {
  await page.route('**/api/v1/status', (route) =>
    route.fulfill({
      json: {
        platforms: {
          tiktok: { status: 'operational', window: '1h', attempts: 12, successRate: 91.7 },
          twitch: { status: 'failing', window: '24h', attempts: 5, successRate: 20 },
          bluesky: { status: 'unknown', window: '24h', attempts: 1, successRate: 100 },
          threads: { status: 'operational', window: '1h', attempts: 9, successRate: 100 },
        },
      },
    }),
  );
  await page.reload();
  const where = page.getByRole('region', { name: 'Where Ferry works' });
  // Each dot says what it means and over which window.
  await expect(where.getByRole('link', { name: /^TikTok.*Working, last hour/ })).toBeVisible();
  await expect(where.getByRole('link', { name: /^Twitch.*Failing, last 24 hours/ })).toBeVisible();
  await expect(where.getByRole('link', { name: /^Bluesky/ })).not.toHaveAccessibleName(/Working|Failing|Some links fail/);
  const field = page.getByLabel('Link to a video, song or post');
  await field.fill('https://www.tiktok.com/@harborlight/video/7431982044417805611');
  await expect(page.locator('#gate-status')).toContainText('Working, last hour');
  // Official-only and protected sites never get a dot: Ferry doesn't download from them.
  await field.fill('https://www.threads.com/@ferry/post/C3abcDEF123');
  await expect(page.locator('#gate-status')).toContainText('Official download only');
  await expect(page.locator('#gate-status')).not.toContainText('Working');
  // Threads isn't on Home any more; its details on Sites show no live status either.
  await page.goto('/sites?site=threads');
  await expect(page.getByRole('button', { name: /^TikTok .*Working, last hour/ })).toBeVisible(); // live status has loaded
  const detail = page.getByRole('region', { name: 'Threads' });
  await expect(detail).toContainText('Official download only');
  await expect(detail).not.toContainText(/Working|Live status/);
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

test('sites: search, filter, logos and official routes; unlisted sites say why', async ({ page, request }) => {
  const { platforms } = await (await request.get('/api/v1/platforms')).json();
  const listed = platforms.filter(downloadable);
  const free = listed.filter((p) => p.policy === 'allowed').length;
  await page.getByRole('link', { name: 'Sites' }).first().click();
  await expect(page.getByRole('heading', { name: 'Sites', level: 1 })).toBeVisible();
  await expect(page.getByText(`${listed.length} sites Ferry can download from.`)).toBeVisible();
  // Three filters by what a site allows; the "Official download only" and "Protected" filters are gone.
  const filters = page.getByRole('group', { name: 'Sites', exact: true });
  await expect(filters.getByRole('button')).toHaveCount(3);
  await expect(filters.getByRole('button', { name: `All ${listed.length}`, exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(filters.getByRole('button', { name: `Free to save ${free}`, exact: true })).toBeVisible();
  await expect(filters.getByRole('button', { name: `With permission ${listed.length - free}`, exact: true })).toBeVisible();
  const search = page.getByRole('searchbox', { name: 'Search sites' });
  await search.fill('youtu');
  await page.getByRole('button', { name: /^YouTube Your own or with permission/ }).click();
  const detail = page.getByRole('region', { name: 'YouTube' });
  // Keyboard users land on the detail right away instead of tabbing past every card.
  await expect(detail.getByRole('heading', { name: 'YouTube', level: 2 })).toBeFocused();
  await expect(detail).toContainText('YouTube Studio');
  await search.fill('');
  await filters.getByRole('button', { name: /^Free to save/ }).click();
  await expect(page.getByRole('button', { name: /^Internet Archive Free to save/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /^TikTok\b/ })).toHaveCount(0);
  await filters.getByRole('button', { name: /^With permission/ }).click();
  await expect(page.getByRole('button', { name: /^TikTok Your own or with permission/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Internet Archive\b/ })).toHaveCount(0);
  await filters.getByRole('button', { name: /^All/ }).click();
  await expect(page.getByRole('button', { name: /^TikTok\b/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Netflix\b/ })).toHaveCount(0);
  // Searching for a site that isn't listed says why, and still opens its details.
  await search.fill('netflix');
  await expect(page.getByText('No listed site matches “netflix”.')).toBeVisible();
  await expect(page.getByText('Netflix isn’t listed because Ferry can’t download from it.')).toBeVisible();
  await expect(page.getByText('DRM or paid content. Ferry never removes protection.')).toBeVisible();
  await expect(page.getByText('Ferry still tries any other page with a plain video or audio file.')).toBeVisible();
  await page.getByRole('button', { name: 'See details for Netflix' }).click();
  await expect(page).toHaveURL(/\/sites\?site=netflix$/);
  await expect(page.getByRole('region', { name: 'Netflix' })).toContainText('Protected');
  await search.fill('reddit');
  await expect(page.getByText('Reddit isn’t listed because Ferry can’t download from it.')).toBeVisible();
  await expect(page.getByText('Reddit doesn’t work with Ferry right now.')).toBeVisible();
  // A site without a logo in Simple Icons gets a letter tile, never an empty square.
  await search.fill('linkedin');
  await expect(page.getByRole('button', { name: /^LinkedIn Your own or with permission/ }).locator('[data-monogram]')).toHaveText('L');
});

test('sites: a Home logo opens that site on the Sites page', async ({ page }) => {
  // The tile says "Archive"; the Sites page names the site in full.
  await page.getByRole('region', { name: 'Where Ferry works' }).getByRole('link', { name: /^Internet Archive:/ }).click();
  await expect(page).toHaveURL(/\/sites\?site=internet-archive$/);
  await expect(page.getByRole('region', { name: 'Internet Archive' })).toBeVisible();
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
