/**
 * Test helpers — kept tiny and inline rather than abstracting.
 */

/**
 * Parse a prompt like "47 + 8 = ?" or "47 − 8 = ?" and return the answer.
 * The minus character may be the ASCII '-' or unicode U+2212 '−'.
 */
export function computeAnswer(promptText) {
  const m = promptText.match(/(-?\d+)\s*([+\-−])\s*(\d+)/);
  if (!m) throw new Error('Cannot parse prompt: ' + promptText);
  const a = parseInt(m[1], 10);
  const op = m[2];
  const b = parseInt(m[3], 10);
  return op === '+' ? a + b : a - b;
}

/**
 * Seed localStorage with the app's persistence key. Call BEFORE page.reload().
 * Marks firstVisitAt so the onboarding tutorial doesn't auto-open and shadow
 * the test's target UI — explicit tutorial tests can override.
 * @param {import('@playwright/test').Page} page
 * @param {Object} state
 */
export async function seedAppState(page, state) {
  const withDefaults = { firstVisitAt: Date.now(), ...state };
  await page.evaluate((s) => {
    localStorage.setItem('soroban_vm_poc', JSON.stringify(s));
  }, withDefaults);
}

/** Read current persisted state. */
export async function readAppState(page) {
  return await page.evaluate(() => {
    const raw = localStorage.getItem('soroban_vm_poc');
    return raw ? JSON.parse(raw) : null;
  });
}

/**
 * Clear localStorage before each test so they start clean — but pre-mark
 * firstVisitAt so the onboarding tutorial doesn't auto-open over the test.
 * Tutorial tests opt out via firstVisitLoad().
 */
export async function freshLoad(page) {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('soroban_vm_poc', JSON.stringify({ firstVisitAt: Date.now() }));
  });
  await page.reload();
}

/** Truly-first-visit load: empty localStorage, no firstVisitAt marker. */
export async function firstVisitLoad(page) {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
}

/** Build a progress object with every skill at status='mastered'. */
export function allMasteredProgress(skillIds) {
  const out = {};
  for (const id of skillIds) {
    out[id] = {
      skillId: id,
      status: 'mastered',
      attempts: 150,
      correct: 145,
      accuracy: 97,
      avgLatencyMs: 1800,
      avgSupportDependency: 0,
      lastPracticedAt: Date.now(),
      provisionalSince: null,
    };
  }
  return out;
}

export const SKILL_IDS = [
  'direct_add_1_4', 'direct_subtract_1_4',
  'five_complement_add', 'five_complement_subtract',
  'ten_complement_add', 'ten_complement_subtract',
  'carry', 'borrow',
  'two_digit_add', 'two_digit_subtract', 'two_digit_mixed',
  'ghost_mode', 'still_hands', 'mental_only',
];
