import { SUPPORT_DEPENDENCY, LATENCY_PAUSE_CAP_MS } from '../config.js';
import { sequencesEqual, sequenceToLabels } from '../keyboard/shortcuts.js';

function makeId() {
  return `att_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

/** @param {number} supportLevel @returns {number} */
export function calculateSupportDependency(supportLevel) {
  return SUPPORT_DEPENDENCY[supportLevel] ?? 0;
}

/**
 * Wall-clock elapsed, capped at LATENCY_PAUSE_CAP_MS. The cap protects mastery
 * stats from idle gaps (tab switched, user walked away).
 * @param {number} startTime @param {number} endTime @returns {number}
 */
export function calculateLatency(startTime, endTime) {
  const raw = endTime - startTime;
  if (!Number.isFinite(raw) || raw < 0) return 0;
  return Math.min(raw, LATENCY_PAUSE_CAP_MS);
}

// ── Numeric evaluation (mental-only / support-level-3 mode) ──────────────────

/**
 * Evaluates a final-answer text input (mental mode or support level 3).
 * Accepts "+3", "-5", "15", "u+8" style strings.
 * @param {string} userInput
 * @param {Object} exercise
 * @param {number} supportLevel
 * @param {number} startTime
 * @returns {Object} attempt record
 */
export function evaluateAnswerNumeric(userInput, exercise, supportLevel, startTime) {
  const endTime = Date.now();
  const latencyMs = calculateLatency(startTime, endTime);
  const supportDependency = calculateSupportDependency(supportLevel);

  const cleaned = userInput.trim().replace(/^u/i, '');
  const num = Number(cleaned);
  const valid = cleaned.length > 0 && !isNaN(num);

  const correct = valid && num === exercise.expectedResult;

  return {
    id: makeId(),
    skillId:        exercise.skillId,
    exerciseId:     exercise.id,
    prompt:         exercise.prompt,
    userInput,
    correct,
    expectedResult: exercise.expectedResult,
    actualResult:   valid ? num : null,
    rule:           exercise.expectedRule,
    latencyMs,
    supportDependency,
    supportLevel,
    errorType:      !valid ? 'INVALID_INPUT' : !correct ? 'WRONG_ANSWER' : null,
    timestamp:      new Date().toISOString(),
  };
}

// Alias kept for backward compatibility
export const evaluateAnswer = evaluateAnswerNumeric;

// ── Sequence evaluation (command / reflex mode) ───────────────────────────────

/**
 * Evaluates a token sequence against the expected soroban operation sequence.
 * @param {Object[]} userSequence   tokens the user entered
 * @param {Object}   exercise
 * @param {Object}   transition     result of applyOperation (contains expectedSequence)
 * @param {number}   supportLevel
 * @param {number}   startTime
 * @returns {Object} attempt record
 */
export function evaluateAnswerSequence(userSequence, exercise, transition, supportLevel, startTime) {
  const endTime = Date.now();
  const latencyMs = calculateLatency(startTime, endTime);
  const supportDependency = calculateSupportDependency(supportLevel);

  const expectedSequence = transition.expectedSequence ?? [];
  const correct = sequencesEqual(userSequence, expectedSequence);
  const userLabel = sequenceToLabels(userSequence).join(', ') || '(empty)';

  return {
    id: makeId(),
    skillId:          exercise.skillId,
    exerciseId:       exercise.id,
    prompt:           exercise.prompt,
    userInput:        userLabel,
    correct,
    expectedResult:   exercise.expectedResult,
    actualResult:     null,
    rule:             exercise.expectedRule,
    userSequence,
    expectedSequence,
    latencyMs,
    supportDependency,
    supportLevel,
    errorType:        correct ? null : 'WRONG_SEQUENCE',
    timestamp:        new Date().toISOString(),
  };
}
