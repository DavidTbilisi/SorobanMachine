import { test, expect } from '@playwright/test';
import { computeAnswer, freshLoad } from './helpers.js';

test.describe('Practice mode smoke', () => {
  test('mental-mode practice submit shows correct feedback', async ({ page }) => {
    await freshLoad(page);

    await page.locator('#support-level').selectOption('3');
    await page.locator('#btn-next').click();

    const prompt = await page.locator('.prompt').innerText();
    await page.locator('#answer-input').fill(String(computeAnswer(prompt)));
    await page.locator('#btn-submit').click();

    // Submit disables; feedback should render (we don't lock down the exact
    // copy, just confirm the panel appears).
    await expect(page.locator('#btn-submit')).toBeDisabled();
    await expect(page.locator('#feedback-container')).not.toBeEmpty();
  });
});

test.describe('Flash Anzan smoke', () => {
  test('Easy preset runs through, result screen reveals expected sum', async ({ page }) => {
    await freshLoad(page);

    await page.locator('.mode-tab', { hasText: 'Flash Anzan' }).click();
    await expect(page.locator('.fa-title')).toHaveText('Flash Anzan');

    await page.locator('[data-fa-start="easy"]').click();

    // Countdown 3 → 2 → 1 → Go (~3.1s) then 5 numbers @ 1000ms ≈ 5s. Wait up to 15s.
    await expect(page.locator('#fa-answer')).toBeVisible({ timeout: 15_000 });

    // Submit any answer — we just want to reach the result screen.
    await page.locator('#fa-answer').fill('0');
    await page.locator('#fa-submit').click();

    await expect(page.locator('.fa-result-text')).toBeVisible();
    await expect(page.locator('.fa-recap')).toContainText('=');
  });
});
