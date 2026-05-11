import { test, expect } from '@playwright/test';
import {
  computeAnswer, freshLoad, seedAppState,
  allMasteredProgress, SKILL_IDS,
} from './helpers.js';

test.describe('Achievements + certificate', () => {
  test('first practice submit unlocks "First Beads" with a toast', async ({ page }) => {
    await freshLoad(page);

    // Switch to mental-only support so we can submit a single numeric answer.
    await page.locator('#support-level').selectOption('3');
    await page.locator('#btn-next').click();

    const prompt = await page.locator('.prompt').innerText();
    await page.locator('#answer-input').fill(String(computeAnswer(prompt)));
    await page.locator('#btn-submit').click();

    await expect(page.locator('.toast').first()).toContainText('First Beads', { timeout: 4000 });

    const firstBeads = page.locator('.ach-card', { hasText: 'First Beads' });
    await expect(firstBeads).toHaveClass(/ach-unlocked/);
  });

  test('all-mastered state shows the Pilot certificate', async ({ page }) => {
    await freshLoad(page);
    await seedAppState(page, {
      appMode: 'practice',
      selectedSkillId: 'direct_add_1_4',
      supportLevel: 0,
      progress: allMasteredProgress(SKILL_IDS),
      attemptLog: [],
      flashAnzan: { phase: 'idle', stats: {}, timers: [] },
      daily: { phase: 'idle', results: {} },
      achievements: { unlocked: {} },
    });
    await page.reload();

    // Pilot button visible in the Achievements section.
    const certBtn = page.locator('#cert-open');
    await expect(certBtn).toBeVisible();

    await certBtn.click();
    await expect(page.locator('.cert-sheet')).toBeVisible();
    await expect(page.locator('.cert-title')).toHaveText('Pilot Certificate');
    await expect(page.locator('.cert-table tbody tr')).toHaveCount(14);

    await page.locator('#cert-close').click();
    await expect(page.locator('.cert-sheet')).not.toBeVisible();
  });

  test('completing the daily unlocks Daily Discipline + Perfect Ten', async ({ page }) => {
    await freshLoad(page);
    await page.locator('.mode-tab', { hasText: 'Daily Challenge' }).click();
    await page.locator('#dc-start').click();

    for (let i = 0; i < 10; i++) {
      const prompt = await page.locator('.dc-prompt').innerText();
      await page.locator('#dc-answer').fill(String(computeAnswer(prompt)));
      await page.locator('#dc-submit').click();
    }

    // Toasts stack; both should be present at least transiently.
    await expect(page.locator('.toast').filter({ hasText: 'Daily Discipline' })).toBeVisible({ timeout: 4000 });
    await expect(page.locator('.toast').filter({ hasText: 'Perfect Ten' })).toBeVisible();

    await page.locator('#dc-back').click();

    await expect(page.locator('.ach-card', { hasText: 'Daily Discipline' })).toHaveClass(/ach-unlocked/);
    await expect(page.locator('.ach-card', { hasText: 'Perfect Ten'      })).toHaveClass(/ach-unlocked/);
  });
});
