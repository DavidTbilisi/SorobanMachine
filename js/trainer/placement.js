/**
 * Placement test — a fixed-progression 10-problem assessment that classifies
 * a new user into Learner / Operator / Pilot tier and recommends a starting
 * skill. Same exercise shape as exercises.js so the rest of the runtime
 * can reuse it without special casing.
 *
 * Pure module: no DOM, no storage.
 */

import { SKILL_IDS } from '../config.js';
import { detectRule } from '../engine/rules.js';

export const PLACEMENT_SET_SIZE = 10;

/**
 * Fixed slate, ramping in difficulty across the curriculum. Two problems per
 * curriculum band so signal is sturdier than a single sample.
 *
 * @typedef {Object} PlacementSpec
 * @property {number} startValue
 * @property {'add'|'subtract'} direction
 * @property {number} amount
 * @property {string} skillId
 * @property {string} band       label used for the per-band scoring breakdown
 */
/** @type {PlacementSpec[]} */
const SLATE = [
  { startValue: 3,  direction: 'add',      amount: 1,  skillId: SKILL_IDS.DIRECT_ADD,               band: 'Direct'         },
  { startValue: 4,  direction: 'subtract', amount: 2,  skillId: SKILL_IDS.DIRECT_SUBTRACT,          band: 'Direct'         },
  { startValue: 3,  direction: 'add',      amount: 4,  skillId: SKILL_IDS.FIVE_COMPLEMENT_ADD,      band: '5-complement'   },
  { startValue: 7,  direction: 'subtract', amount: 3,  skillId: SKILL_IDS.FIVE_COMPLEMENT_SUBTRACT, band: '5-complement'   },
  { startValue: 6,  direction: 'add',      amount: 7,  skillId: SKILL_IDS.TEN_COMPLEMENT_ADD,       band: '10-complement'  },
  { startValue: 12, direction: 'subtract', amount: 7,  skillId: SKILL_IDS.TEN_COMPLEMENT_SUBTRACT,  band: '10-complement'  },
  { startValue: 28, direction: 'add',      amount: 5,  skillId: SKILL_IDS.CARRY,                    band: 'Carry / borrow' },
  { startValue: 32, direction: 'subtract', amount: 6,  skillId: SKILL_IDS.BORROW,                   band: 'Carry / borrow' },
  { startValue: 45, direction: 'add',      amount: 27, skillId: SKILL_IDS.TWO_DIGIT_ADD,            band: 'Two-digit'      },
  { startValue: 87, direction: 'subtract', amount: 49, skillId: SKILL_IDS.TWO_DIGIT_SUBTRACT,       band: 'Two-digit'      },
];

export function buildPlacementProblems() {
  return SLATE.map((p, idx) => {
    const expected = p.direction === 'add' ? p.startValue + p.amount : p.startValue - p.amount;
    const sign = p.direction === 'add' ? '+' : '−';
    const numCols = p.startValue >= 10 || expected >= 10 ? 2 : 1;
    return {
      id:             `placement_${idx}`,
      skillId:        p.skillId,
      band:           p.band,
      numCols,
      startValue:     p.startValue,
      direction:      p.direction,
      amount:         p.amount,
      prompt:         `${p.startValue} ${sign} ${p.amount} = ?`,
      expectedRule:   detectRule(p.startValue % 10, p.direction, p.amount),
      expectedResult: expected,
    };
  });
}

export function evaluatePlacementAnswer(raw, expected) {
  const trimmed = String(raw ?? '').trim().replace(/^u/i, '').replace(/^−/, '-');
  if (!trimmed) return { correct: false, parsed: null, expected };
  const parsed = parseInt(trimmed, 10);
  if (!Number.isFinite(parsed)) return { correct: false, parsed: null, expected };
  return { correct: parsed === expected, parsed, expected };
}

/**
 * Classify a finished run into a tier + suggested skill.
 * @param {Array<{correct:boolean, band?:string}>} perAnswer
 */
export function classifyPlacement(perAnswer) {
  const total = perAnswer.length;
  const correct = perAnswer.filter(a => a.correct).length;

  // Per-band breakdown for the result UI.
  const byBand = {};
  for (let i = 0; i < perAnswer.length; i++) {
    const band = SLATE[i]?.band ?? '?';
    (byBand[band] ??= { correct: 0, total: 0 });
    byBand[band].total++;
    if (perAnswer[i].correct) byBand[band].correct++;
  }

  let tier, icon, suggestion, message;
  if (correct <= 4) {
    tier = 'Learner';
    icon = '🌱';
    suggestion = SKILL_IDS.DIRECT_ADD;
    message = 'Start with Direct Add to build the bead foundation.';
  } else if (correct <= 7) {
    tier = 'Operator';
    icon = '🎓';
    suggestion = SKILL_IDS.TEN_COMPLEMENT_ADD;
    message = "You've got the basics — head into 10-complement to level up.";
  } else {
    tier = 'Pilot';
    icon = '🏆';
    suggestion = SKILL_IDS.TWO_DIGIT_MIXED;
    message = 'Strong all-around. Jump straight to mixed 2-digit work.';
  }

  return { tier, icon, correct, total, suggestion, message, byBand };
}
