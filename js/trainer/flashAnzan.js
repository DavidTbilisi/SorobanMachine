/**
 * Flash Anzan — classic mental-math demo: numbers flash one by one,
 * the user adds them in their head, then enters the final sum.
 *
 * Pure module: no DOM, no storage, no timers.
 */

export const PRESETS = {
  easy:    { label: 'Easy',    count: 5,  digits: 1, speedMs: 1000 },
  medium:  { label: 'Medium',  count: 7,  digits: 1, speedMs: 600  },
  hard:    { label: 'Hard',    count: 10, digits: 2, speedMs: 400  },
  extreme: { label: 'Extreme', count: 15, digits: 3, speedMs: 350  },
};

export const PRESET_ORDER = ['easy', 'medium', 'hard', 'extreme'];

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function digitRange(digits) {
  if (digits === 1) return [1, 9];
  if (digits === 2) return [10, 99];
  if (digits === 3) return [100, 999];
  return [1, 9];
}

/**
 * @param {{count:number, digits:number}} config
 * @returns {{numbers:number[], sum:number}}
 */
export function generateFlashSequence(config) {
  const { count, digits } = config;
  const [lo, hi] = digitRange(digits);
  const numbers = [];
  for (let i = 0; i < count; i++) numbers.push(randInt(lo, hi));
  const sum = numbers.reduce((a, b) => a + b, 0);
  return { numbers, sum };
}

/**
 * @param {string} rawInput
 * @param {number} expectedSum
 * @returns {{correct:boolean, parsed:(number|null), expected:number}}
 */
export function evaluateFlashAnswer(rawInput, expectedSum) {
  const trimmed = String(rawInput ?? '').trim();
  if (!trimmed) return { correct: false, parsed: null, expected: expectedSum };
  const parsed = parseInt(trimmed, 10);
  if (!Number.isFinite(parsed)) return { correct: false, parsed: null, expected: expectedSum };
  return { correct: parsed === expectedSum, parsed, expected: expectedSum };
}

export function createInitialFlashStats() {
  return PRESET_ORDER.reduce((acc, k) => {
    acc[k] = { played: 0, correct: 0, streak: 0, bestStreak: 0 };
    return acc;
  }, {});
}

/**
 * @param {Object} stats
 * @param {string} presetKey
 * @param {boolean} wasCorrect
 */
export function updateFlashStats(stats, presetKey, wasCorrect) {
  const current = stats[presetKey] ?? { played: 0, correct: 0, streak: 0, bestStreak: 0 };
  const streak = wasCorrect ? current.streak + 1 : 0;
  return {
    ...stats,
    [presetKey]: {
      played:     current.played + 1,
      correct:    current.correct + (wasCorrect ? 1 : 0),
      streak,
      bestStreak: Math.max(current.bestStreak, streak),
    },
  };
}
