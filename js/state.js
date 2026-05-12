import { SKILL_IDS } from './config.js';
import { createInitialProgress } from './trainer/progress.js';
import { createInitialFlashAnzanState } from './ui/flashAnzan.js';
import { createInitialDailyState } from './ui/daily.js';
import { createInitialAchievementsState } from './trainer/achievements.js';
import { createInitialChallengeState } from './ui/challenge.js';

/** @returns {Object} fresh app state */
export function createInitialAppState() {
  return {
    appMode:          'practice',   // 'practice' | 'flash' | 'daily'
    selectedSkillId:  SKILL_IDS.DIRECT_ADD,
    supportLevel:     0,
    currentExercise:  null,
    exerciseStartTime: null,
    lastAttempt:      null,
    progress:         createInitialProgress(),
    attemptLog:       [],
    inputMode:        'command',  // 'command' | 'reflex'
    inputSequence:    [],         // current token sequence being built
    hintsVisible:     true,       // toggled by H key
    focusedCol:       0,          // which rod the shortcut keys operate on (0=ones)
    vizMode:          'grid',
    flashAnzan:       createInitialFlashAnzanState(),
    daily:            createInitialDailyState(),
    achievements:     createInitialAchievementsState(),
    challenge:        createInitialChallengeState(),
    profile:          { name: null },
    settings:         { soundOn: true, confettiOn: true },
  };
}

export function resetAppState() {
  return createInitialAppState();
}
