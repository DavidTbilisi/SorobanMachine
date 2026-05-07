import { SKILL_IDS } from '../config.js';
import { detectRule } from '../engine/rules.js';

let counter = 0;
function nextId() { return `ex_${++counter}_${Date.now()}`; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[randInt(0, arr.length - 1)]; }

/**
 * Skills that always present a final-answer (numeric) input regardless of
 * the user's selected support level. The soroban is hidden during practice.
 */
const MENTAL_ONLY_SKILLS = new Set([
  SKILL_IDS.GHOST_MODE,
  SKILL_IDS.STILL_HANDS,
  SKILL_IDS.MENTAL_ONLY,
]);

/** @returns {boolean} */
export function isMentalOnlySkill(skillId) {
  return MENTAL_ONLY_SKILLS.has(skillId);
}

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
    case SKILL_IDS.TWO_DIGIT_ADD:            return genTwoDigitAdd(id, skillId);
    case SKILL_IDS.TWO_DIGIT_SUBTRACT:       return genTwoDigitSubtract(id, skillId);
    case SKILL_IDS.TWO_DIGIT_MIXED:          return genTwoDigitMixed(id, skillId);
    case SKILL_IDS.GHOST_MODE:               return genGhostMode(id, skillId);
    case SKILL_IDS.STILL_HANDS:              return genStillHands(id, skillId);
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

// ── Two-digit operations (full range, mix of direct + complement) ────────────

function makeTwoDigitOp(id, skillId, startValue, direction, amount) {
  const expectedResult = direction === 'add' ? startValue + amount : startValue - amount;
  return {
    id, skillId, numCols: 2,
    startValue, direction, amount,
    prompt: `${startValue} ${direction === 'add' ? '+' : '−'} ${amount} = ?`,
    expectedRule: detectRule(startValue % 10, direction, amount),
    expectedResult,
  };
}

function genTwoDigitAdd(id, skillId) {
  const candidates = [];
  for (let tens = 1; tens <= 8; tens++)
    for (let ones = 0; ones <= 9; ones++)
      for (let a = 1; a <= 9; a++) {
        const start = tens * 10 + ones;
        if (start + a <= 99) candidates.push([start, a]);
      }
  const [start, a] = pick(candidates);
  return makeTwoDigitOp(id, skillId, start, 'add', a);
}

function genTwoDigitSubtract(id, skillId) {
  const candidates = [];
  for (let tens = 1; tens <= 9; tens++)
    for (let ones = 0; ones <= 9; ones++)
      for (let a = 1; a <= 9; a++) {
        const start = tens * 10 + ones;
        if (start - a >= 0) candidates.push([start, a]);
      }
  const [start, a] = pick(candidates);
  return makeTwoDigitOp(id, skillId, start, 'subtract', a);
}

function genTwoDigitMixed(id, skillId) {
  return Math.random() < 0.5
    ? genTwoDigitAdd(id, skillId)
    : genTwoDigitSubtract(id, skillId);
}

// ── Mental skills (final-answer input, soroban hidden) ────────────────────────

function genGhostMode(id, skillId) {
  // Single-op 2-digit ± 1-digit, mental
  const direction = Math.random() < 0.5 ? 'add' : 'subtract';
  const candidates = [];
  for (let start = 10; start <= 99; start++)
    for (let a = 1; a <= 9; a++) {
      const r = direction === 'add' ? start + a : start - a;
      if (r >= 0 && r <= 99) candidates.push([start, a]);
    }
  const [start, a] = pick(candidates);
  const expectedResult = direction === 'add' ? start + a : start - a;
  return {
    id, skillId, numCols: 2,
    startValue: start, direction, amount: a,
    prompt: `${start} ${direction === 'add' ? '+' : '−'} ${a} = ?`,
    expectedRule: detectRule(start % 10, direction, a),
    expectedResult,
  };
}

function genStillHands(id, skillId) {
  // Chain of 2 operations on a 2-digit start, mental
  const start = randInt(10, 89);
  const ops = [];
  let value = start;
  for (let i = 0; i < 2; i++) {
    const choices = [];
    for (let a = 1; a <= 9; a++) {
      if (value + a <= 99) choices.push({ direction: 'add',      amount: a });
      if (value - a >= 0)  choices.push({ direction: 'subtract', amount: a });
    }
    const op = pick(choices);
    ops.push(op);
    value = op.direction === 'add' ? value + op.amount : value - op.amount;
  }
  const promptOps = ops.map(o => `${o.direction === 'add' ? '+' : '−'} ${o.amount}`).join(' ');
  return {
    id, skillId, numCols: 2,
    startValue: start, direction: ops[0].direction, amount: ops[0].amount,
    ops,
    prompt: `${start} ${promptOps} = ?`,
    expectedRule: 'CHAIN',
    expectedResult: value,
  };
}
