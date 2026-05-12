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

// ── Number grid view ─────────────────────────────────────────────────────────

const viewsMod = await import('../js/ui/views.js');

const countMatches = (s, re) => (s.match(re) || []).length;

test('numberGrid: A and B cell counts match operands', () => {
  const cases = [
    [9,  5, 'add'],
    [47, 8, 'add'],
    [47, 8, 'subtract'],
    [10, 5, 'add'],
    [89, 9, 'add'],
  ];
  for (const [startValue, amount, direction] of cases) {
    const html = viewsMod.numberGridHTML(
      { startValue, amount, direction, skillId: 'two_digit_add' },
      0
    );
    const aFills = countMatches(html, /fill="#d8a0a0"/g);
    const bFills = countMatches(html, /fill="#a0c898"/g);
    assertEq(aFills, startValue, `A=${startValue} ${direction} ${amount}`);
    assertEq(bFills, amount,     `B=${amount} ${direction} ${amount}`);
  }
});

test('numberGrid: hidden for mental skills', () => {
  const html = viewsMod.numberGridHTML(
    { startValue: 47, amount: 8, direction: 'add', skillId: 'ghost_mode' },
    0
  );
  assertEq(html, '');
});

test('numberGrid: hidden at supportLevel 3', () => {
  const html = viewsMod.numberGridHTML(
    { startValue: 47, amount: 8, direction: 'add', skillId: 'two_digit_add' },
    3
  );
  assertEq(html, '');
});

test('numberGrid: hidden for chain exercises', () => {
  const html = viewsMod.numberGridHTML(
    { startValue: 47, amount: 8, direction: 'add', skillId: 'two_digit_add', ops: [{}, {}] },
    0
  );
  assertEq(html, '');
});

test('numberGrid: B starts on the row after A finishes', () => {
  // A=10 fills row 0 entirely, B should start at cell 10 (row 1, col 0)
  const html = viewsMod.numberGridHTML(
    { startValue: 10, amount: 3, direction: 'add', skillId: 'two_digit_add' },
    0
  );
  assertEq(countMatches(html, /fill="#d8a0a0"/g), 10);
  assertEq(countMatches(html, /fill="#a0c898"/g), 3);
  // A=9 fills 9 of row 0; B should still start at row 1, NOT row 0 col 9
  const html2 = viewsMod.numberGridHTML(
    { startValue: 9, amount: 5, direction: 'add', skillId: 'ten_complement_add' },
    0
  );
  assertEq(countMatches(html2, /fill="#d8a0a0"/g), 9);
  assertEq(countMatches(html2, /fill="#a0c898"/g), 5);
});

// ── Latency cap (idle protection) ────────────────────────────────────────────

test('calculateLatency caps at 30s for long pauses', () => {
  const now = Date.now();
  // 2 minutes pause — should be capped.
  assertEq(scMod.calculateLatency(now - 120_000, now), 30_000, 'expected 30s cap');
  // Below cap — passes through.
  assertEq(scMod.calculateLatency(now - 1500, now), 1500);
  // Negative / weird → 0
  assertEq(scMod.calculateLatency(now + 1000, now), 0);
});

test('evaluateAnswerNumeric records capped latency on a long pause', () => {
  const ex = exMod.generateExercise(cfg.SKILL_IDS.GHOST_MODE);
  const startedAt = Date.now() - 5 * 60 * 1000;  // 5 min ago
  const att = scMod.evaluateAnswerNumeric(String(ex.expectedResult), ex, 3, startedAt);
  assertEq(att.latencyMs, cfg.LATENCY_PAUSE_CAP_MS);
});

// ── Run ──────────────────────────────────────────────────────────────────────

let passed = 0, failed = 0;
for (const { name, fn } of tests) {
  try { fn(); console.log('PASS  ' + name); passed++; }
  catch (e) { console.log('FAIL  ' + name + ' :: ' + e.message); failed++; }
}
console.log('\n' + passed + '/' + tests.length + ' passed');
process.exit(failed ? 1 : 0);
