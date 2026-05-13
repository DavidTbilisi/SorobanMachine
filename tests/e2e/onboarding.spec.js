import { test, expect } from '@playwright/test';
import { computeAnswer, freshLoad, firstVisitLoad, readAppState } from './helpers.js';

test.describe('Tutorial', () => {
  test('auto-opens on a truly-first visit and walks through steps', async ({ page }) => {
    await firstVisitLoad(page);

    await expect(page.locator('.tu-title')).toBeVisible();
    await expect(page.locator('.tu-title')).toHaveText('Meet the soroban');

    // 5 dots, first active
    await expect(page.locator('.tu-dot')).toHaveCount(5);
    await expect(page.locator('.tu-dot').first()).toHaveClass(/tu-dot-active/);

    // Walk to the end
    for (let i = 0; i < 4; i++) await page.locator('#tu-next').click();
    await expect(page.locator('.tu-title')).toHaveText("You're ready");

    await page.locator('#tu-finish').click();
    await expect(page.locator('#tutorial-modal')).toBeHidden();
  });

  test('does NOT auto-open on subsequent visits', async ({ page }) => {
    await freshLoad(page);
    await expect(page.locator('#tutorial-modal')).toBeHidden();
  });

  test('❓ header button reopens the tutorial', async ({ page }) => {
    await freshLoad(page);
    await page.locator('#open-tutorial').click();
    await expect(page.locator('.tu-title')).toHaveText('Meet the soroban');
    await page.locator('#tu-dismiss').click();
    await expect(page.locator('#tutorial-modal')).toBeHidden();
  });
});

test.describe('Placement test', () => {
  test('full run: 10/10 → Pilot tier, Jump button switches skill', async ({ page }) => {
    await freshLoad(page);
    await page.locator('#open-placement').click();

    await expect(page.locator('.pl-title')).toHaveText('Where should you start?');
    await page.locator('#pl-start').click();

    for (let i = 0; i < 10; i++) {
      const prompt = await page.locator('.pl-prompt').innerText();
      await page.locator('#pl-answer').fill(String(computeAnswer(prompt)));
      await page.locator('#pl-submit').click();
    }

    await expect(page.locator('.pl-result-tier')).toHaveText('Pilot');
    await expect(page.locator('.pl-result-score')).toContainText('10 / 10');
    // Band breakdown table — 5 rows (one per band).
    await expect(page.locator('.pl-band-table tbody tr')).toHaveCount(5);

    await page.locator('#pl-jump').click();
    await expect(page.locator('#placement-modal')).toBeHidden();

    // Suggested skill for Pilot is two_digit_mixed — confirm radio selected.
    const persisted = await readAppState(page);
    expect(persisted.selectedSkillId).toBe('two_digit_mixed');
  });

  test('low score → Learner tier, suggestion is direct_add_1_4', async ({ page }) => {
    await freshLoad(page);
    await page.locator('#open-placement').click();
    await page.locator('#pl-start').click();

    // Submit wrong answer for every problem (use a fixed wrong value).
    for (let i = 0; i < 10; i++) {
      await page.locator('#pl-answer').fill('-999');
      await page.locator('#pl-submit').click();
    }

    await expect(page.locator('.pl-result-tier')).toHaveText('Learner');
    await page.locator('#pl-jump').click();
    const persisted = await readAppState(page);
    expect(persisted.selectedSkillId).toBe('direct_add_1_4');
  });
});
