// Standalone smoke-test for the new "coming soon" skill implementations.
// Run via: node tests/smoke.mjs

import * as exMod from '../js/trainer/exercises.js';
import * as mcMod from '../js/engine/multicolumn.js';
import * as opMod from '../js/engine/operations.js';
import * as scMod from '../js/trainer/scoring.js';
import * as cfg   from '../js/config.js';
import * as sk    from '../js/trainer/skills.js';
import * as pg    from '../js/trainer/progress.js';

const tests = [];
const test = (name, fn) => tests.push({ name, fn });
const assert = (cond, msg) => { if (!cond) throw new Error(msg || 'assertion failed'); };
const assertEq = (a, b, msg) => {
  if (JSON.stringify(a) !== JSON.stringify(b))
    throw new Error((msg || 'eq') + ': ' + JSON.stringify(a) + ' !== ' + JSON.stringify(b));
};

// ── Generators ────────────────────────────────────────────────────────────────

test('two_digit_add: valid exercise, expectedResult correct', () => {
  for (let i = 0; i < 50; i++) {
    const ex = exMod.generateExercise(cfg.SKILL_IDS.TWO_DIGIT_ADD);
    assertEq(ex.expectedResult, ex.startValue + ex.amount);
    assert(ex.numCols === 2);
    assert(ex.startValue >= 10 && ex.startValue <= 98);
    assert(ex.amount >= 1 && ex.amount <= 9);
    assert(ex.expectedResult <= 99);
  }
});

test('two_digit_subtract: valid exercise, result >= 0', () => {
  for (let i = 0; i < 50; i++) {
    const ex = exMod.generateExercise(cfg.SKILL_IDS.TWO_DIGIT_SUBTRACT);
    assertEq(ex.expectedResult, ex.startValue - ex.amount);
    assert(ex.expectedResult >= 0);
    assert(ex.numCols === 2);
  }
});

test('two_digit_mixed: covers both directions', () => {
  const dirs = new Set();
  for (let i = 0; i < 80; i++) {
    dirs.add(exMod.generateExercise(cfg.SKILL_IDS.TWO_DIGIT_MIXED).direction);
  }
  assert(dirs.has('add') && dirs.has('subtract'), 'mixed should produce both directions');
});

test('ghost_mode: bounded result 0-99, numCols=2', () => {
  for (let i = 0; i < 50; i++) {
    const ex = exMod.generateExercise(cfg.SKILL_IDS.GHOST_MODE);
    assert(ex.expectedResult >= 0 && ex.expectedResult <= 99);
    assert(ex.numCols === 2);
  }
});

test('still_hands: chain of 2 ops, expectedResult matches chain math', () => {
  for (let i = 0; i < 50; i++) {
    const ex = exMod.generateExercise(cfg.SKILL_IDS.STILL_HANDS);
    assert(ex.ops && ex.ops.length === 2);
    let v = ex.startValue;
    for (const op of ex.ops) v = op.direction === 'add' ? v + op.amount : v - op.amount;
    assertEq(v, ex.expectedResult, 'chain math');
    assert(v >= 0 && v <= 99, 'chain in range');
    assertEq(ex.expectedRule, 'CHAIN');
  }
});

// ── Mental-skill registry ─────────────────────────────────────────────────────

test('isMentalOnlySkill: GHOST/STILL/MENTAL only', () => {
  assert(exMod.isMentalOnlySkill(cfg.SKILL_IDS.GHOST_MODE));
  assert(exMod.isMentalOnlySkill(cfg.SKILL_IDS.STILL_HANDS));
  assert(exMod.isMentalOnlySkill(cfg.SKILL_IDS.MENTAL_ONLY));
  assert(!exMod.isMentalOnlySkill(cfg.SKILL_IDS.TWO_DIGIT_ADD));
  assert(!exMod.isMentalOnlySkill(cfg.SKILL_IDS.CARRY));
  assert(!exMod.isMentalOnlySkill(undefined));
});

// ── Sequence scoring (round-trip) ─────────────────────────────────────────────

const seqRoundTrip = (skillId, label) => () => {
  for (let i = 0; i < 30; i++) {
    const ex = exMod.generateExercise(skillId);
    const t  = mcMod.applyMultiColumnOperation(ex.startValue, ex.direction, ex.amount);
    const a  = scMod.evaluateAnswerSequence(t.expectedSequence, ex, t, 0, Date.now() - 100);
    assert(a.correct, label + ' should be correct: ' + ex.prompt + ' seq=' + JSON.stringify(t.expectedSequence));
  }
};

test('two_digit_add: expected sequence scores correct',      seqRoundTrip(cfg.SKILL_IDS.TWO_DIGIT_ADD,      'two_digit_add'));
test('two_digit_subtract: expected sequence scores correct', seqRoundTrip(cfg.SKILL_IDS.TWO_DIGIT_SUBTRACT, 'two_digit_subtract'));
test('two_digit_mixed: expected sequence scores correct',    seqRoundTrip(cfg.SKILL_IDS.TWO_DIGIT_MIXED,    'two_digit_mixed'));

test('two_digit_add: wrong sequence scores incorrect', () => {
  const ex = exMod.generateExercise(cfg.SKILL_IDS.TWO_DIGIT_ADD);
  const t  = mcMod.applyMultiColumnOperation(ex.startValue, ex.direction, ex.amount);
  const wrong = [{ col: 0, direction: 'add', amount: 99 }];
  const a = scMod.evaluateAnswerSequence(wrong, ex, t, 0, Date.now() - 100);
  assert(!a.correct, 'wrong seq must be marked incorrect');
});

// ── Numeric scoring for mental skills ────────────────────────────────────────

test('ghost_mode: correct final answer scores correct', () => {
  for (let i = 0; i < 30; i++) {
    const ex = exMod.generateExercise(cfg.SKILL_IDS.GHOST_MODE);
    const a  = scMod.evaluateAnswerNumeric(String(ex.expectedResult), ex, 3, Date.now() - 100);
    assert(a.correct, 'ghost: ' + ex.prompt + ' = ' + ex.expectedResult);
  }
});

test('ghost_mode: wrong answer scores incorrect', () => {
  const ex = exMod.generateExercise(cfg.SKILL_IDS.GHOST_MODE);
  const a  = scMod.evaluateAnswerNumeric(String(ex.expectedResult + 1), ex, 3, Date.now() - 100);
  assert(!a.correct);
});

test('still_hands: chain final answer scores correct', () => {
  for (let i = 0; i < 30; i++) {
    const ex = exMod.generateExercise(cfg.SKILL_IDS.STILL_HANDS);
    const a  = scMod.evaluateAnswerNumeric(String(ex.expectedResult), ex, 3, Date.now() - 100);
    assert(a.correct, 'still_hands: ' + ex.prompt + ' = ' + ex.expectedResult);
  }
});

// ── Skill tree state ─────────────────────────────────────────────────────────

test('all 5 coming-soon skills are now implemented', () => {
  for (const id of [
    cfg.SKILL_IDS.TWO_DIGIT_ADD,
    cfg.SKILL_IDS.TWO_DIGIT_SUBTRACT,
    cfg.SKILL_IDS.TWO_DIGIT_MIXED,
    cfg.SKILL_IDS.GHOST_MODE,
    cfg.SKILL_IDS.STILL_HANDS,
  ]) {
    assert(sk.isSkillImplemented(id), id + ' not implemented');
  }
});

test('createInitialProgress has no LOCKED skills', () => {
  const p = pg.createInitialProgress();
  for (const id of Object.values(cfg.SKILL_IDS)) {
    assert(p[id].status === cfg.STATUS.LEARNING, id + ' status=' + p[id].status);
  }
});

test('getRecommendationHint surfaces for unmet prereqs', () => {
  const p = pg.createInitialProgress();
  const hint = sk.getRecommendationHint(cfg.SKILL_IDS.GHOST_MODE, p);
  assert(hint && hint.includes('Recommended'), 'expected recommendation, got: ' + hint);
  assert(sk.getRecommendationHint(cfg.SKILL_IDS.DIRECT_ADD, p) === null);
});

// ── Engine sanity (sampled) ──────────────────────────────────────────────────

test('multicolumn expectedSequence reconstructs to expected result', () => {
  const samples = [
    [80,'add',1], [44,'add',5], [42,'add',6], [42,'add',5], [84,'add',6],
    [71,'subtract',1], [79,'subtract',8], [26,'subtract',8], [99,'subtract',9], [55,'subtract',5],
  ];
  for (const [v, d, a] of samples) {
    const r = mcMod.applyMultiColumnOperation(v, d, a);
    let onesNet = 0, tensNet = 0;
    for (const t of r.expectedSequence) {
      const sign = t.direction === 'add' ? 1 : -1;
      if (t.col === 0) onesNet += sign * t.amount;
      if (t.col === 1) tensNet += sign * t.amount;
    }
    const reconstructed = v + tensNet * 10 + onesNet;
    const expected = d === 'add' ? v + a : v - a;
    assertEq(reconstructed, expected, v + ' ' + d + ' ' + a);
  }
});

// ── Regressions for legacy skills ────────────────────────────────────────────

test('legacy CARRY exercise still scores correctly', () => {
  const ex = exMod.generateExercise(cfg.SKILL_IDS.CARRY);
  const t  = mcMod.applyMultiColumnOperation(ex.startValue, ex.direction, ex.amount);
  const a  = scMod.evaluateAnswerSequence(t.expectedSequence, ex, t, 0, Date.now() - 100);
  assert(a.correct, 'CARRY: ' + ex.prompt);
});

test('legacy BORROW exercise still scores correctly', () => {
  const ex = exMod.generateExercise(cfg.SKILL_IDS.BORROW);
  const t  = mcMod.applyMultiColumnOperation(ex.startValue, ex.direction, ex.amount);
  const a  = scMod.evaluateAnswerSequence(t.expectedSequence, ex, t, 0, Date.now() - 100);
  assert(a.correct, 'BORROW: ' + ex.prompt);
});

test('legacy single-col five_complement_subtract still scores correctly', () => {
  for (let i = 0; i < 20; i++) {
    const ex = exMod.generateExercise(cfg.SKILL_IDS.FIVE_COMPLEMENT_SUBTRACT);
    const t  = opMod.applyOperation(ex.startValue, ex.direction, ex.amount);
    const a  = scMod.evaluateAnswerSequence(t.expectedSequence, ex, t, 0, Date.now() - 100);
    assert(a.correct, 'fcs: ' + ex.prompt);
  }
});

// ── Run ──────────────────────────────────────────────────────────────────────

let passed = 0, failed = 0;
for (const { name, fn } of tests) {
  try { fn(); console.log('PASS  ' + name); passed++; }
  catch (e) { console.log('FAIL  ' + name + ' :: ' + e.message); failed++; }
}
console.log('\n' + passed + '/' + tests.length + ' passed');
process.exit(failed ? 1 : 0);
