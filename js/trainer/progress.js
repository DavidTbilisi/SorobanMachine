import { STATUS, SKILL_IDS, RUSTY_THRESHOLD_MS } from '../config.js';

/** @returns {Object} initial progress keyed by skillId */
export function createInitialProgress() {
  const progress = {};
  for (const id of Object.values(SKILL_IDS)) {
    progress[id] = {
      skillId: id,
      status: STATUS.LEARNING,
      attempts: 0,
      correct: 0,
      accuracy: 0,
      avgLatencyMs: 0,
      avgSupportDependency: 0,
      lastPracticedAt: null,
      provisionalSince: null,   // set when gate first passes; cleared on mastery
    };
  }
  return progress;
}

/**
 * Migrates any legacy LOCKED skill in saved progress to LEARNING.
 * Skills are no longer hard-gated by prerequisites — sequence is a recommendation.
 * @param {Object} progress
 * @returns {Object}
 */
export function migrateLockedToLearning(progress) {
  const updated = { ...progress };
  for (const id of Object.keys(updated)) {
    if (updated[id]?.status === STATUS.LOCKED) {
      updated[id] = { ...updated[id], status: STATUS.LEARNING };
    }
  }
  return updated;
}

/**
 * Updates running stats for the skill after one attempt.
 * Does NOT change status — status transitions happen in app.js.
 * @param {Object} progress
 * @param {Object} attempt
 * @returns {Object}
 */
export function updateProgress(progress, attempt) {
  const prev = progress[attempt.skillId];
  const n = prev.attempts + 1;
  const correct = prev.correct + (attempt.correct ? 1 : 0);
  return {
    ...progress,
    [attempt.skillId]: {
      ...prev,
      attempts: n,
      correct,
      accuracy: Math.round((correct / n) * 100),
      avgLatencyMs: Math.round(((prev.avgLatencyMs * (n - 1)) + attempt.latencyMs) / n),
      avgSupportDependency: parseFloat(
        (((prev.avgSupportDependency * (n - 1)) + attempt.supportDependency) / n).toFixed(2)
      ),
      lastPracticedAt: attempt.timestamp,
    },
  };
}

/**
 * Recalculates all stats for a skill from its raw attempt list.
 * @param {string} skillId
 * @param {Object[]} attempts
 * @returns {Object}
 */
export function recalculateSkillProgress(skillId, attempts) {
  const filtered = attempts.filter(a => a.skillId === skillId);
  if (!filtered.length) {
    return { skillId, attempts: 0, correct: 0, accuracy: 0, avgLatencyMs: 0, avgSupportDependency: 0, lastPracticedAt: null };
  }
  const correct = filtered.filter(a => a.correct).length;
  return {
    skillId,
    attempts: filtered.length,
    correct,
    accuracy: Math.round((correct / filtered.length) * 100),
    avgLatencyMs: Math.round(filtered.reduce((s, a) => s + a.latencyMs, 0) / filtered.length),
    avgSupportDependency: parseFloat(
      (filtered.reduce((s, a) => s + a.supportDependency, 0) / filtered.length).toFixed(2)
    ),
    lastPracticedAt: filtered[filtered.length - 1].timestamp,
  };
}

/**
 * No-op kept for call-site compatibility. Skills are no longer hard-locked by
 * prerequisites; the sequence is surfaced as a recommendation instead.
 * @param {Object} progress
 * @returns {Object}
 */
export function unlockEligibleSkills(progress) {
  return progress;
}

/**
 * Marks mastered skills as RUSTY if not practiced within RUSTY_THRESHOLD_MS.
 * Call on startup and after each attempt.
 * @param {Object} progress
 * @returns {Object}
 */
export function applyRustyDecay(progress) {
  const now = Date.now();
  const updated = { ...progress };
  for (const id of Object.values(SKILL_IDS)) {
    const p = updated[id];
    if (!p) continue;  // defensive — partial saved state may be missing a skill
    if (p.status === STATUS.MASTERED && p.lastPracticedAt) {
      const elapsed = now - new Date(p.lastPracticedAt).getTime();
      if (elapsed >= RUSTY_THRESHOLD_MS) {
        updated[id] = { ...p, status: STATUS.RUSTY };
      }
    }
  }
  return updated;
}
