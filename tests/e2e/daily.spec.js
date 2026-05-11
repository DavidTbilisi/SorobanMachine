import { test, expect } from '@playwright/test';
import { computeAnswer, freshLoad, readAppState } from './helpers.js';

test.describe('Daily Challenge', () => {
  test('full perfect run records score, flips today cell, increments streak', async ({ page }) => {
    await freshLoad(page);

    await page.locator('.mode-tab', { hasText: 'Daily Challenge' }).click();
    await expect(page.locator('.dc-title')).toHaveText('Daily Challenge');

    // Idle stats — streak should start at 0
    const statValues = page.locator('.dc-stat-value');
    await expect(statValues.first()).toHaveText('0');

    await page.locator('#dc-start').click();

    for (let i = 0; i < 10; i++) {
      await expect(page.locator('.dc-progress-label')).toContainText(`${i + 1} / 10`);
      const prompt = await page.locator('.dc-prompt').innerText();
      const answer = computeAnswer(prompt);
      await page.locator('#dc-answer').fill(String(answer));
      await page.locator('#dc-submit').click();
    }

    await expect(page.locator('.dc-result-score')).toHaveText('10 / 10');
    // UI joins cells with a single space for visual breathing room.
    await expect(page.locator('.dc-result-grid')).toHaveText('🟩 🟩 🟩 🟩 🟩 🟩 🟩 🟩 🟩 🟩');

    await page.locator('#dc-back').click();
    await expect(page.locator('.dc-title')).toBeVisible();
    await expect(statValues.first()).toHaveText('1');

    // Today's cell (last cell, index 13 in the 14-day strip) should be perfect.
    const cells = page.locator('.dc-cell');
    await expect(cells.nth(13)).toHaveClass(/dc-cell-perfect/);

    const persisted = await readAppState(page);
    const today = Object.keys(persisted.daily.results)[0];
    expect(persisted.daily.results[today].correct).toBe(10);
    expect(persisted.daily.results[today].total).toBe(10);
  });

  test('same day produces same problem set (determinism)', async ({ page }) => {
    await freshLoad(page);
    await page.locator('.mode-tab', { hasText: 'Daily Challenge' }).click();

    const collect = async () => {
      await page.locator('#dc-start').click();
      const prompts = [];
      for (let i = 0; i < 10; i++) {
        prompts.push(await page.locator('.dc-prompt').innerText());
        const answer = computeAnswer(prompts[i]);
        await page.locator('#dc-answer').fill(String(answer));
        await page.locator('#dc-submit').click();
      }
      await page.locator('#dc-back').click();
      return prompts;
    };

    const runA = await collect();
    const runB = await collect();
    expect(runB).toEqual(runA);
  });

  test('abandoning mid-run returns to idle without recording a result', async ({ page }) => {
    await freshLoad(page);
    await page.locator('.mode-tab', { hasText: 'Daily Challenge' }).click();
    await page.locator('#dc-start').click();

    // Answer one then bail
    const prompt = await page.locator('.dc-prompt').innerText();
    await page.locator('#dc-answer').fill(String(computeAnswer(prompt)));
    await page.locator('#dc-submit').click();
    await page.locator('#dc-back').click();

    await expect(page.locator('#dc-start')).toBeVisible();
    const persisted = await readAppState(page);
    expect(Object.keys(persisted.daily.results ?? {})).toHaveLength(0);
  });
});
