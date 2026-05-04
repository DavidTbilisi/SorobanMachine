import { SKILL_GATES } from '../config.js';

/** @param {string} skillId @returns {Object} gate thresholds */
export function getGate(skillId) {
  return SKILL_GATES[skillId] ?? SKILL_GATES['direct_add_1_4'];
}

/** @returns {boolean} */
export function canMasterSkill(skillId, progress) {
  return getMasteryBlockers(skillId, progress).every(c => c.pass);
}

/**
 * Returns one object per metric with pass/fail state and a message.
 * @param {string} skillId
 * @param {Object} progress
 * @returns {{ metric: string, pass: boolean, message: string }[]}
 */
export function getMasteryBlockers(skillId, progress) {
  const gate = getGate(skillId);
  const p = progress[skillId];
  if (!p) return [{ metric: 'skill', pass: false, message: 'Skill not found.' }];

  const checks = [
    {
      metric: 'Attempts',
      pass: p.attempts >= gate.minAttempts,
      message: p.attempts >= gate.minAttempts
        ? `${p.attempts} attempts ✓`
        : `${p.attempts}/${gate.minAttempts} attempts`,
    },
    {
      metric: 'Accuracy',
      pass: p.accuracy >= gate.minAccuracy,
      message: p.accuracy >= gate.minAccuracy
        ? `${p.accuracy}% ✓`
        : `${p.accuracy}% (need ${gate.minAccuracy}%)`,
    },
    {
      metric: 'Latency',
      pass: p.attempts === 0 || p.avgLatencyMs <= gate.maxLatencyMs,
      message: p.attempts === 0
        ? '—'
        : p.avgLatencyMs <= gate.maxLatencyMs
          ? `${p.avgLatencyMs}ms ✓`
          : `${p.avgLatencyMs}ms (need ≤${gate.maxLatencyMs}ms)`,
    },
    {
      metric: 'Independence',
      pass: p.attempts === 0 || p.avgSupportDependency <= gate.maxSupportDependency,
      message: p.attempts === 0
        ? '—'
        : p.avgSupportDependency <= gate.maxSupportDependency
          ? `dep ${p.avgSupportDependency} ✓`
          : `dep ${p.avgSupportDependency} (need ≤${gate.maxSupportDependency})`,
    },
  ];

  return checks;
}

/** @returns {string[]} only failing blocker messages */
export function getFailingBlockers(skillId, progress) {
  return getMasteryBlockers(skillId, progress)
    .filter(c => !c.pass)
    .map(c => c.message);
}
