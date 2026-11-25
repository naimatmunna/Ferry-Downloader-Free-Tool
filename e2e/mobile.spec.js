import { test, expect } from '@playwright/test';
import { FIXTURES, analyze, confirmRights, freshApp } from './helpers.js';

test('mobile: bottom navigation, sticky download bar, one-handed flow', async ({ page }) => {
  await freshApp(page);
  const tabBar = page.getByRole('navigation', { name: 'Main' }).last();
  await expect(tabBar).toBeVisible();
  await expect(tabBar.getByRole('link', { name: 'Downloads' })).toBeVisible();

  await analyze(page, `${FIXTURES}/portrait.mp4`);
  await expect(page.getByRole('radio', { name: /^720p HD/ })).toBeVisible(); // vertical video labelled by its class
  await confirmRights(page);

  // The primary action is pinned above the tab bar.
  const sticky = page.getByRole('button', { name: 'Download 720p MP4' }).last();
  await expect(sticky).toBeInViewport();
  const box = await sticky.boundingBox();
  const viewport = page.viewportSize();
  expect(box.y).toBeGreaterThan(viewport.height * 0.7);
  expect(box.height).toBeGreaterThanOrEqual(44); // touch target

  await sticky.click();
  await tabBar.getByRole('link', { name: 'Downloads' }).click();
  await expect(page.getByRole('main').getByRole('button', { name: /^Save/ })).toBeVisible({ timeout: 90_000 });

  // No horizontal scrolling at phone width.
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test('mobile: GitHub button fits, and the footer is never hidden behind the bars', async ({ page }) => {
  await freshApp(page);
  await expect(page.getByRole('banner').getByRole('link', { name: 'Star on GitHub' })).toBeVisible();
  const tabBar = page.getByRole('navigation', { name: 'Main' }).last();
  const lastLine = page.getByRole('contentinfo').getByText(/^© \d{4} Ferry$/);
  const bottomOf = (box) => box.y + box.height;
  const scrollToEnd = () => page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));

  await scrollToEnd();
  await expect(lastLine).toBeInViewport();
  expect(bottomOf(await lastLine.boundingBox())).toBeLessThanOrEqual((await tabBar.boundingBox()).y);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);

  // With a result open, the Download bar sits above the tab bar; the footer still clears it.
  await analyze(page, `${FIXTURES}/portrait.mp4`);
  await expect(page.getByRole('radio', { name: /^720p HD/ })).toBeVisible();
  const downloadBar = page.getByRole('button', { name: 'Download 720p MP4' }).last().locator('..');
  await scrollToEnd();
  await expect(lastLine).toBeInViewport();
  expect(bottomOf(await lastLine.boundingBox())).toBeLessThanOrEqual((await downloadBar.boundingBox()).y);
});
