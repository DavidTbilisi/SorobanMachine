import { test, expect } from '@playwright/test';
import { computeAnswer, freshLoad } from './helpers.js';

test.describe('Share-card clipboard', () => {
  test('Daily share writes formatted card to clipboard', async ({ page, context, browserName }) => {
    test.skip(browserName !== 'chromium', 'clipboard API is most stable in Chromium');
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    await freshLoad(page);
    await page.locator('.mode-tab', { hasText: 'Daily Challenge' }).click();
    await page.locator('#dc-start').click();

    for (let i = 0; i < 10; i++) {
      const prompt = await page.locator('.dc-prompt').innerText();
      await page.locator('#dc-answer').fill(String(computeAnswer(prompt)));
      await page.locator('#dc-submit').click();
    }

    await expect(page.locator('.dc-result-grid')).toBeVisible();
    await page.locator('[data-share="daily"]').click();
    await expect(page.locator('.toast').filter({ hasText: 'Copied' })).toBeVisible();

    const clip = await page.evaluate(() => navigator.clipboard.readText());
    expect(clip).toContain('🧮 Soroban Machine — Daily');
    expect(clip).toContain('10/10');
    expect(clip).toMatch(/🟩🟩🟩🟩🟩 🟩🟩🟩🟩🟩/);
  });

  test('Flash share writes formatted card to clipboard', async ({ page, context, browserName }) => {
    test.skip(browserName !== 'chromium', 'clipboard API is most stable in Chromium');
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    await freshLoad(page);
    await page.locator('.mode-tab', { hasText: 'Flash Anzan' }).click();
    await page.locator('[data-fa-start="easy"]').click();

    await expect(page.locator('#fa-answer')).toBeVisible({ timeout: 15_000 });
    await page.locator('#fa-answer').fill('0');
    await page.locator('#fa-submit').click();

    await expect(page.locator('.fa-result-text')).toBeVisible();
    await page.locator('[data-share="flash"]').click();
    await expect(page.locator('.toast').filter({ hasText: 'Copied' })).toBeVisible();

    const clip = await page.evaluate(() => navigator.clipboard.readText());
    expect(clip).toContain('🧮 Soroban Machine — Flash Anzan');
    expect(clip).toContain('Easy');
    expect(clip).toContain('5× 1-digit');
  });
});
