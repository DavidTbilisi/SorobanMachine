/**
 * Daily Challenge — a fixed set of mental-math problems generated
 * deterministically per calendar date so every player faces the same
 * set on the same day (the basis for shareable result cards + streaks).
 *
 * Pure module: no DOM, no storage, no timers.
 */

import { SKILL_IDS } from '../config.js';
import { detectRule } from '../engine/rules.js';

export const DAILY_SET_SIZE = 10;

/**
 * Curated skill mix per slot — gentle slope from direct beads up to
 * mixed two-digit. Keep length = DAILY_SET_SIZE.
 */
const DAILY_SLOTS = [
  SKILL_IDS.DIRECT_ADD,
  SKILL_IDS.DIRECT_SUBTRACT,
  SKILL_IDS.FIVE_COMPLEMENT_ADD,
  SKILL_IDS.FIVE_COMPLEMENT_SUBTRACT,
  SKILL_IDS.TEN_COMPLEMENT_ADD,
  SKILL_IDS.TEN_COMPLEMENT_SUBTRACT,
  SKILL_IDS.CARRY,
  SKILL_IDS.BORROW,
  SKILL_IDS.TWO_DIGIT_ADD,
  SKILL_IDS.TWO_DIGIT_SUBTRACT,
];

// ── Local-date key & seeded PRNG ─────────────────────────────────────────────

/**
 * @param {Date} [d]
 * @returns {string} "YYYY-MM-DD" in local time
 */
export function dateKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** FNV-1a 32-bit hash of the date string. */
function hashKey(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/** mulberry32 PRNG — returns a `next()` that yields floats in [0,1). */
function mulberry32(seed) {
  let s = seed >>> 0;
  return function next() {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function rng(seed) {
  const next = mulberry32(seed);
  return {
    int: (lo, hi) => Math.floor(next() * (hi - lo + 1)) + lo,
    pick: arr => arr[Math.floor(next() * arr.length)],
  };
}

// ── Seeded candidate enumerators ────────────────────────────────────────────

const CANDIDATES = {
  [SKILL_IDS.DIRECT_ADD]: (() => {
    const out = [];
    for (let c = 0; c <= 3; c++) for (let a = 1; a <= 4; a++) if (c + a <= 4) out.push([c, 'add', a]);
    return out;
  })(),
  [SKILL_IDS.DIRECT_SUBTRACT]: (() => {
    const out = [];
    for (let c = 1; c <= 4; c++) for (let a = 1; a <= 4; a++) if (c - a >= 0) out.push([c, 'subtract', a]);
    return out;
  })(),
  [SKILL_IDS.FIVE_COMPLEMENT_ADD]: (() => {
    const out = [];
    for (let c = 1; c <= 4; c++) for (let a = 1; a <= 9; a++) {
      const r = c + a;
      if (r >= 5 && r <= 9) out.push([c, 'add', a]);
    }
    return out;
  })(),
  [SKILL_IDS.FIVE_COMPLEMENT_SUBTRACT]: (() => {
    const out = [];
    for (let c = 5; c <= 9; c++) for (let a = 1; a <= 4; a++) {
      const r = c - a;
      if (r >= 0 && r < 5) out.push([c, 'subtract', a]);
    }
    return out;
  })(),
  [SKILL_IDS.TEN_COMPLEMENT_ADD]: (() => {
    const out = [];
    for (let c = 1; c <= 9; c++) for (let a = 5; a <= 9; a++) if (c + a >= 10) out.push([c, 'add', a]);
    return out;
  })(),
  [SKILL_IDS.TEN_COMPLEMENT_SUBTRACT]: (() => {
    const out = [];
    for (let c = 0; c <= 9; c++) for (let a = 5; a <= 9; a++) if (c - a < 0) out.push([c, 'subtract', a]);
    return out;
  })(),
  [SKILL_IDS.CARRY]: (() => {
    const out = [];
    for (let t = 1; t <= 8; t++) for (let c = 1; c <= 9; c++) for (let a = 5; a <= 9; a++) {
      if (c + a >= 10) out.push([t * 10 + c, 'add', a]);
    }
    return out;
  })(),
  [SKILL_IDS.BORROW]: (() => {
    const out = [];
    for (let t = 1; t <= 9; t++) for (let c = 0; c <= 9; c++) for (let a = 5; a <= 9; a++) {
      if (c - a < 0) out.push([t * 10 + c, 'subtract', a]);
    }
    return out;
  })(),
  [SKILL_IDS.TWO_DIGIT_ADD]: (() => {
    const out = [];
    for (let t = 1; t <= 8; t++) for (let o = 0; o <= 9; o++) for (let a = 1; a <= 9; a++) {
      const s = t * 10 + o;
      if (s + a <= 99) out.push([s, 'add', a]);
    }
    return out;
  })(),
  [SKILL_IDS.TWO_DIGIT_SUBTRACT]: (() => {
    const out = [];
    for (let t = 1; t <= 9; t++) for (let o = 0; o <= 9; o++) for (let a = 1; a <= 9; a++) {
      const s = t * 10 + o;
      if (s - a >= 0) out.push([s, 'subtract', a]);
    }
    return out;
  })(),
};

const TWO_COL_SKILLS = new Set([
  SKILL_IDS.CARRY, SKILL_IDS.BORROW,
  SKILL_IDS.TWO_DIGIT_ADD, SKILL_IDS.TWO_DIGIT_SUBTRACT,
]);

function buildProblem(dateStr, slotIdx, skillId, startValue, direction, amount) {
  const expectedResult = direction === 'add' ? startValue + amount : startValue - amount;
  const sign = direction === 'add' ? '+' : '−';
  const numCols = TWO_COL_SKILLS.has(skillId) ? 2 : 1;
  const onesDigit = numCols === 2 ? startValue % 10 : startValue;
  return {
    id:             `daily_${dateStr}_${slotIdx}`,
    skillId,
    numCols,
    startValue,
    direction,
    amount,
    prompt:         `${startValue} ${sign} ${amount} = ?`,
    expectedRule:   detectRule(onesDigit, direction, amount),
    expectedResult,
  };
}

/**
 * @param {string} dateStr  "YYYY-MM-DD"
 * @returns {Object[]}  array of exercise-shaped problems
 */
export function generateDailySet(dateStr) {
  const r = rng(hashKey(dateStr));
  return DAILY_SLOTS.map((skillId, idx) => {
    const candidates = CANDIDATES[skillId];
    const [s, dir, a] = r.pick(candidates);
    return buildProblem(dateStr, idx, skillId, s, dir, a);
  });
}

// ── Answer evaluation ────────────────────────────────────────────────────────

/**
 * @param {string} raw
 * @param {number} expected
 * @returns {{correct:boolean, parsed:(number|null), expected:number}}
 */
export function evaluateDailyAnswer(raw, expected) {
  const trimmed = String(raw ?? '').trim().replace(/^u/i, '').replace(/^−/, '-');
  if (!trimmed) return { correct: false, parsed: null, expected };
  const parsed = parseInt(trimmed, 10);
  if (!Number.isFinite(parsed)) return { correct: false, parsed: null, expected };
  return { correct: parsed === expected, parsed, expected };
}

// ── Initial state ────────────────────────────────────────────────────────────

export function createInitialDailyState() {
  return {
    phase:       'idle',   // idle | playing | result
    date:        null,     // active run's date key
    problems:    [],
    idx:         0,
    perAnswer:   [],       // [{ correct, parsed, expected, latencyMs }]
    questionStartedAt: null,
    runStartedAt:      null,
    results:     {},       // keyed by dateKey → { date, total, correct, perAnswer, totalMs, finishedAt }
  };
}

/** Strip non-serializable runtime fields before saving. */
export function serializableDailyState(d) {
  const base = createInitialDailyState();
  return { ...base, results: d?.results ?? {} };
}

// ── Streak computation ──────────────────────────────────────────────────────

function shiftDay(dateStr, delta) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + delta);
  return dateKey(dt);
}

/**
 * Streak = number of consecutive prior days (including today if completed)
 * that have a saved result. Yesterday-only is also counted as a 1-day streak
 * so users don't lose it the moment a new day starts.
 *
 * @param {Object} results
 * @param {string} today
 * @returns {{current:number, longest:number}}
 */
export function computeStreak(results, today) {
  let cursor = today;
  if (!results[cursor]) cursor = shiftDay(today, -1);

  let current = 0;
  while (results[cursor]) {
    current++;
    cursor = shiftDay(cursor, -1);
  }

  // Longest run across all stored results.
  const dates = Object.keys(results).sort();
  let longest = 0, run = 0, prev = null;
  for (const d of dates) {
    if (prev && shiftDay(prev, 1) === d) run++;
    else run = 1;
    if (run > longest) longest = run;
    prev = d;
  }

  return { current, longest };
}

// ── Run-recording helpers (called by ui controller) ─────────────────────────

export function finalizeRun(daily) {
  const correct = daily.perAnswer.filter(a => a.correct).length;
  // Total = sum of per-problem (already-capped) latencies, NOT wall-clock.
  // This way pauses BETWEEN problems also don't inflate the recap.
  const totalMs = daily.perAnswer.reduce((sum, a) => sum + (a.latencyMs || 0), 0);
  return {
    date:        daily.date,
    total:       daily.problems.length,
    correct,
    perAnswer:   daily.perAnswer.map(a => ({ correct: a.correct, latencyMs: a.latencyMs })),
    totalMs,
    finishedAt:  Date.now(),
  };
}
