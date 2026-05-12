import { test, expect } from '@playwright/test';
import { computeAnswer } from './helpers.js';

test.describe('Friend challenge', () => {
  test('opening a challenge URL shows invitation, accept → play → result', async ({ page }) => {
    // Each test gets a fresh context, so localStorage starts empty.
    // Navigate straight to the hash URL — hash-only changes don't trigger a
    // full reload, so the boot script must see the hash on the first load.
    await page.goto('/#challenge?d=2026-05-01&s=6&t=10&ms=120000&n=David');

    await expect(page.locator('.ch-title')).toContainText('David challenges you');
    await expect(page.locator('.ch-score-box').first()).toContainText('6/10');

    await page.locator('#ch-accept').click();
    await expect(page.locator('.ch-prompt')).toBeVisible();

    for (let i = 0; i < 10; i++) {
      const prompt = await page.locator('.ch-prompt').innerText();
      await page.locator('#ch-answer').fill(String(computeAnswer(prompt)));
      await page.locator('#ch-submit').click();
    }

    await expect(page.locator('.ch-result-headline')).toBeVisible();
    await expect(page.locator('.ch-result-headline')).toContainText('You beat David');
    await expect(page.locator('.ch-result-grid')).toContainText('🟩');
  });

  test('"Maybe later" dismisses invitation and clears the hash', async ({ page }) => {
    await page.goto('/#challenge?d=2026-05-01&s=3&t=10&ms=50000&n=Pat');

    await expect(page.locator('.ch-title')).toContainText('Pat challenges you');
    await page.locator('#ch-dismiss').click();

    await expect(page.locator('#challenge-modal')).toBeHidden();
    expect(await page.evaluate(() => window.location.hash)).toBe('');
  });

  test('garbage hash is ignored — no modal appears', async ({ page }) => {
    await page.goto('/#challenge?d=NOTADATE');

    await expect(page.locator('#challenge-modal')).toBeHidden();
    await expect(page.locator('h1')).toContainText('Soroban Machine');
  });
});
