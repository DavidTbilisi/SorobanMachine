import { SKILL_IDS, STATUS } from '../config.js';

/**
 * Full skill tree. `implemented: false` means no exercises exist yet —
 * these skills appear in the dashboard/tree but cannot be practiced.
 */
const SKILL_TREE = [
  { id: SKILL_IDS.DIRECT_ADD,              label: 'Direct Add (1–4)',          prerequisites: [],                                                                    implemented: true  },
  { id: SKILL_IDS.DIRECT_SUBTRACT,         label: 'Direct Subtract (1–4)',     prerequisites: [],                                                                    implemented: true  },
  { id: SKILL_IDS.FIVE_COMPLEMENT_ADD,     label: 'Five Complement Add',       prerequisites: [SKILL_IDS.DIRECT_ADD],                                                implemented: true  },
  { id: SKILL_IDS.FIVE_COMPLEMENT_SUBTRACT,label: 'Five Complement Subtract',  prerequisites: [SKILL_IDS.DIRECT_SUBTRACT],                                           implemented: true  },
  { id: SKILL_IDS.TEN_COMPLEMENT_ADD,      label: 'Ten Complement Add',        prerequisites: [SKILL_IDS.FIVE_COMPLEMENT_ADD],                                       implemented: true  },
  { id: SKILL_IDS.TEN_COMPLEMENT_SUBTRACT, label: 'Ten Complement Subtract',   prerequisites: [SKILL_IDS.FIVE_COMPLEMENT_SUBTRACT],                                  implemented: true  },
  { id: SKILL_IDS.CARRY,                   label: 'Carry (2-col)',             prerequisites: [SKILL_IDS.TEN_COMPLEMENT_ADD],                                        implemented: false },
  { id: SKILL_IDS.BORROW,                  label: 'Borrow (2-col)',            prerequisites: [SKILL_IDS.TEN_COMPLEMENT_SUBTRACT],                                   implemented: false },
  { id: SKILL_IDS.TWO_DIGIT_ADD,           label: '2-Digit Addition',          prerequisites: [SKILL_IDS.CARRY],                                                     implemented: false },
  { id: SKILL_IDS.TWO_DIGIT_SUBTRACT,      label: '2-Digit Subtraction',       prerequisites: [SKILL_IDS.BORROW],                                                   implemented: false },
  { id: SKILL_IDS.TWO_DIGIT_MIXED,         label: 'Mixed 2-Digit',             prerequisites: [SKILL_IDS.TWO_DIGIT_ADD, SKILL_IDS.TWO_DIGIT_SUBTRACT],              implemented: false },
  { id: SKILL_IDS.GHOST_MODE,              label: 'Ghost Mode',                prerequisites: [SKILL_IDS.TWO_DIGIT_MIXED],                                          implemented: false },
  { id: SKILL_IDS.STILL_HANDS,             label: 'Still Hands',               prerequisites: [SKILL_IDS.GHOST_MODE],                                               implemented: false },
  { id: SKILL_IDS.MENTAL_ONLY,             label: 'Mental Soroban',            prerequisites: [SKILL_IDS.STILL_HANDS],                                              implemented: true  },
];

export function getAllSkills() {
  return SKILL_TREE;
}

export function getUnlockedSkills(progress) {
  return SKILL_TREE.filter(s => isSkillUnlocked(s.id, progress));
}

/**
 * A skill is unlocked when all prerequisites are mastered.
 * @param {string} skillId
 * @param {Object} progress
 * @returns {boolean}
 */
export function isSkillUnlocked(skillId, progress) {
  const skill = SKILL_TREE.find(s => s.id === skillId);
  if (!skill) return false;
  return skill.prerequisites.every(id => progress[id]?.status === STATUS.MASTERED);
}

/** @returns {boolean} */
export function isSkillImplemented(skillId) {
  return SKILL_TREE.find(s => s.id === skillId)?.implemented ?? false;
}

/**
 * @param {string} skillId
 * @param {Object} progress
 * @returns {string|null}
 */
export function getLockedReason(skillId, progress) {
  const skill = SKILL_TREE.find(s => s.id === skillId);
  if (!skill) return 'Unknown skill.';
  const unmet = skill.prerequisites.filter(id => progress[id]?.status !== STATUS.MASTERED);
  if (!unmet.length) return null;
  const labels = unmet.map(id => SKILL_TREE.find(s => s.id === id)?.label ?? id);
  return `Requires mastery of: ${labels.join(', ')}.`;
}
