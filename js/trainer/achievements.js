/**
 * Achievement catalog + evaluation.
 *
 * Pure module: predicates read the app state; no DOM, no storage.
 * The runtime owns the unlocked map ({ achievementId: timestamp }) and
 * persists it alongside the rest of app state.
 */

import { STATUS, SKILL_IDS } from '../config.js';
import { computeStreak, dateKey } from './daily.js';

/**
 * @typedef {Object} Achievement
 * @property {string} id
 * @property {string} label
 * @property {string} icon
 * @property {string} description
 * @property {string} group       // for grouping in the UI
 * @property {(s:Object)=>boolean} predicate
 */

const FIVE_COMP_IDS = [
  SKILL_IDS.FIVE_COMPLEMENT_ADD,
  SKILL_IDS.FIVE_COMPLEMENT_SUBTRACT,
  SKILL_IDS.TEN_COMPLEMENT_ADD,
  SKILL_IDS.TEN_COMPLEMENT_SUBTRACT,
];

const mastered = (p, id) => p?.[id]?.status === STATUS.MASTERED;

/** @type {Achievement[]} */
const CATALOG = [
  { id: 'first_attempt', label: 'First Beads', icon: '🌱', group: 'Practice',
    description: 'Submit your first practice exercise.',
    predicate: s => (s.attemptLog?.length ?? 0) >= 1 },

  { id: 'first_mastery', label: 'Learner → Pilot', icon: '🎓', group: 'Practice',
    description: 'Master your first skill.',
    predicate: s => Object.values(s.progress ?? {}).some(p => p.status === STATUS.MASTERED) },

  { id: 'complement_complete', label: 'Complement Champion', icon: '🪄', group: 'Practice',
    description: 'Master all four complement skills (5± and 10±).',
    predicate: s => FIVE_COMP_IDS.every(id => mastered(s.progress, id)) },

  { id: 'two_digit_pro', label: 'Two-Digit Pro', icon: '🔢', group: 'Practice',
    description: 'Master both 2-digit addition and 2-digit subtraction.',
    predicate: s => mastered(s.progress, SKILL_IDS.TWO_DIGIT_ADD) && mastered(s.progress, SKILL_IDS.TWO_DIGIT_SUBTRACT) },

  { id: 'sub_second_direct', label: 'Lightning Fingers', icon: '⚡', group: 'Practice',
    description: 'Direct Add: average latency under 1.0s over 40+ attempts.',
    predicate: s => {
      const p = s.progress?.[SKILL_IDS.DIRECT_ADD];
      return !!p && p.attempts >= 40 && p.avgLatencyMs > 0 && p.avgLatencyMs < 1000;
    } },

  { id: 'pilot', label: 'Soroban Pilot', icon: '🏆', group: 'Practice',
    description: 'Master all 14 skills. Unlocks the Pilot Certificate.',
    predicate: s => Object.values(SKILL_IDS).every(id => mastered(s.progress, id)) },

  { id: 'first_daily', label: 'Daily Discipline', icon: '📅', group: 'Daily',
    description: 'Complete one Daily Challenge.',
    predicate: s => Object.keys(s.daily?.results ?? {}).length >= 1 },

  { id: 'perfect_daily', label: 'Perfect Ten', icon: '💯', group: 'Daily',
    description: 'Score 10 / 10 on a Daily Challenge.',
    predicate: s => Object.values(s.daily?.results ?? {}).some(r => r.correct === r.total) },

  { id: 'streak_3', label: 'On a Roll', icon: '🔥', group: 'Daily',
    description: 'Reach a 3-day Daily streak.',
    predicate: s => computeStreak(s.daily?.results ?? {}, dateKey()).longest >= 3 },

  { id: 'streak_7', label: 'Week One', icon: '🔥🔥', group: 'Daily',
    description: 'Reach a 7-day Daily streak.',
    predicate: s => computeStreak(s.daily?.results ?? {}, dateKey()).longest >= 7 },

  { id: 'streak_30', label: 'Month Strong', icon: '🔥🔥🔥', group: 'Daily',
    description: 'Reach a 30-day Daily streak.',
    predicate: s => computeStreak(s.daily?.results ?? {}, dateKey()).longest >= 30 },

  { id: 'flash_hard',    label: 'Flash Adept',  icon: '✨', group: 'Flash Anzan',
    description: 'Get a Hard Flash Anzan round correct.',
    predicate: s => (s.flashAnzan?.stats?.hard?.correct ?? 0) >= 1 },

  { id: 'flash_extreme', label: 'Anzan Master', icon: '🚀', group: 'Flash Anzan',
    description: 'Get an Extreme Flash Anzan round correct.',
    predicate: s => (s.flashAnzan?.stats?.extreme?.correct ?? 0) >= 1 },
];

export function getAchievementCatalog() { return CATALOG; }

export function getAchievement(id) {
  return CATALOG.find(a => a.id === id) ?? null;
}

/**
 * Returns the IDs of achievements that should be unlocked now but aren't yet.
 * Pure — caller is responsible for adding them to state with a timestamp.
 * @param {Object} state
 * @returns {string[]}
 */
export function evaluateNewAchievements(state) {
  const unlocked = state.achievements?.unlocked ?? {};
  const newly = [];
  for (const a of CATALOG) {
    if (unlocked[a.id]) continue;
    let ok = false;
    try { ok = a.predicate(state); } catch { ok = false; }
    if (ok) newly.push(a.id);
  }
  return newly;
}

export function createInitialAchievementsState() {
  return { unlocked: {} };  // { [achievementId]: unlockedAt (ms) }
}

/** True if all 14 skills are mastered (Pilot tier). */
export function isPilotEarned(state) {
  return Object.values(SKILL_IDS).every(id => mastered(state.progress, id));
}
