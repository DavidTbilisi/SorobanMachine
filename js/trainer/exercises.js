import { SKILL_IDS } from '../config.js';
import { detectRule } from '../engine/rules.js';

let counter = 0;
function nextId() { return `ex_${++counter}_${Date.now()}`; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[randInt(0, arr.length - 1)]; }

function makeExercise(id, skillId, startValue, direction, amount) {
  const expectedResult = direction === 'add' ? startValue + amount : startValue - amount;
  return {
    id, skillId, startValue, direction, amount,
    prompt: `${startValue} ${direction === 'add' ? '+' : '−'} ${amount} = ?`,
    expectedRule: detectRule(startValue, direction, amount),
    expectedResult,
  };
}

/**
 * Generates a valid exercise for the given skill.
 * Ten-complement exercises are restricted to amounts 5–9 so that all
 * complement values (1–5) are expressible as single shortcut key presses.
 * @param {string} skillId
 * @returns {Object}
 */
export function generateExercise(skillId) {
  const id = nextId();
  switch (skillId) {
    case SKILL_IDS.DIRECT_ADD:               return genDirectAdd(id, skillId);
    case SKILL_IDS.DIRECT_SUBTRACT:          return genDirectSubtract(id, skillId);
    case SKILL_IDS.FIVE_COMPLEMENT_ADD:      return genFiveCompAdd(id, skillId);
    case SKILL_IDS.FIVE_COMPLEMENT_SUBTRACT: return genFiveCompSubtract(id, skillId);
    case SKILL_IDS.TEN_COMPLEMENT_ADD:       return genTenCompAdd(id, skillId);
    case SKILL_IDS.TEN_COMPLEMENT_SUBTRACT:  return genTenCompSubtract(id, skillId);
    case SKILL_IDS.CARRY:                    return genCarry(id, skillId);
    case SKILL_IDS.BORROW:                   return genBorrow(id, skillId);
    case SKILL_IDS.MENTAL_ONLY:              return genMentalOnly(id, skillId);
    default:
      throw new Error(`Exercises for "${skillId}" are not yet implemented.`);
  }
}

// ── Generators ────────────────────────────────────────────────────────────────

function genDirectAdd(id, skillId) {
  const candidates = [];
  for (let c = 0; c <= 3; c++)
    for (let a = 1; a <= 4; a++)
      if (c + a <= 4) candidates.push([c, a]);
  const [c, a] = pick(candidates);
  return makeExercise(id, skillId, c, 'add', a);
}

function genDirectSubtract(id, skillId) {
  const candidates = [];
  for (let c = 1; c <= 4; c++)
    for (let a = 1; a <= 4; a++)
      if (c - a >= 0) candidates.push([c, a]);
  const [c, a] = pick(candidates);
  return makeExercise(id, skillId, c, 'subtract', a);
}

function genFiveCompAdd(id, skillId) {
  // current < 5, result 5–9 (upper bead activation required)
  const candidates = [];
  for (let c = 1; c <= 4; c++)
    for (let a = 1; a <= 9; a++) {
      const r = c + a;
      if (r >= 5 && r <= 9) candidates.push([c, a]);
    }
  const [c, a] = pick(candidates);
  return makeExercise(id, skillId, c, 'add', a);
}

function genFiveCompSubtract(id, skillId) {
  // current >= 5, result 0–4, amount 1–4 (keeps complement 5−amount positive)
  const candidates = [];
  for (let c = 5; c <= 9; c++)
    for (let a = 1; a <= 4; a++) {
      const r = c - a;
      if (r >= 0 && r < 5) candidates.push([c, a]);
    }
  const [c, a] = pick(candidates);
  return makeExercise(id, skillId, c, 'subtract', a);
}

function genTenCompAdd(id, skillId) {
  // amount restricted to 5–9 so complement (10−amount = 1–5) is a single key press
  const candidates = [];
  for (let c = 1; c <= 9; c++)
    for (let a = 5; a <= 9; a++)
      if (c + a >= 10) candidates.push([c, a]);
  const [c, a] = pick(candidates);
  return makeExercise(id, skillId, c, 'add', a);
}

function genTenCompSubtract(id, skillId) {
  // amount restricted to 5–9 so complement (10−amount = 1–5) is a single key press
  const candidates = [];
  for (let c = 0; c <= 9; c++)
    for (let a = 5; a <= 9; a++)
      if (c - a < 0) candidates.push([c, a]);
  const [c, a] = pick(candidates);
  return makeExercise(id, skillId, c, 'subtract', a);
}

function genCarry(id, skillId) {
  const candidates = [];
  for (let tens = 1; tens <= 8; tens++)
    for (let ones = 1; ones <= 9; ones++)
      for (let a = 5; a <= 9; a++)
        if (ones + a >= 10) candidates.push([tens, ones, a]);
  const [t, c, a] = pick(candidates);
  const startValue = t * 10 + c;
  return {
    id, skillId, numCols: 2,
    startValue, direction: 'add', amount: a,
    prompt: `${startValue} + ${a} = ?`,
    expectedRule: detectRule(c, 'add', a),
    expectedResult: startValue + a,
  };
}

function genBorrow(id, skillId) {
  const candidates = [];
  for (let tens = 1; tens <= 9; tens++)
    for (let ones = 0; ones <= 9; ones++)
      for (let a = 5; a <= 9; a++)
        if (ones - a < 0) candidates.push([tens, ones, a]);
  const [t, c, a] = pick(candidates);
  const startValue = t * 10 + c;
  return {
    id, skillId, numCols: 2,
    startValue, direction: 'subtract', amount: a,
    prompt: `${startValue} − ${a} = ?`,
    expectedRule: detectRule(c, 'subtract', a),
    expectedResult: startValue - a,
  };
}

function genMentalOnly(id, skillId) {
  const direction = Math.random() < 0.5 ? 'add' : 'subtract';
  return makeExercise(id, skillId, randInt(0, 9), direction, randInt(1, 9));
}
