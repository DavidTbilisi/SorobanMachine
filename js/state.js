import { SKILL_IDS } from './config.js';
import { createInitialProgress } from './trainer/progress.js';

/** @returns {Object} fresh app state */
export function createInitialAppState() {
  return {
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
  };
}

export function resetAppState() {
  return createInitialAppState();
}
