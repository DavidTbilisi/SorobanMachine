export const STORAGE_KEY = 'soroban_vm_poc';

export const SUPPORT_LEVELS = { FULL: 0, NO_RULE_HINT: 1, NO_TRANSITION_HINT: 2, MENTAL_ONLY: 3 };

export const SUPPORT_LABELS = {
  0: 'Full Support',
  1: 'No Rule Hint',
  2: 'No Transition Hint',
  3: 'Mental Only',
};

/** Dependency score added to running average per support level (lower = better) */
export const SUPPORT_DEPENDENCY = { 0: 5, 1: 3, 2: 1, 3: 0 };

export const STATUS = {
  LOCKED:      'locked',
  LEARNING:    'learning',
  PROVISIONAL: 'provisional',  // gate met — awaiting 24 h return session
  MASTERED:    'mastered',
  RUSTY:       'rusty',        // mastered but not practiced for 14+ days
};

/** Human-readable license rank per status */
export const LICENSE = {
  locked:      '—',
  learning:    'Learner',
  provisional: 'Operator',
  mastered:    'Pilot',
  rusty:       'Rusty',
};

export const SKILL_IDS = {
  DIRECT_ADD:              'direct_add_1_4',
  DIRECT_SUBTRACT:         'direct_subtract_1_4',
  FIVE_COMPLEMENT_ADD:     'five_complement_add',
  FIVE_COMPLEMENT_SUBTRACT:'five_complement_subtract',
  TEN_COMPLEMENT_ADD:      'ten_complement_add',
  TEN_COMPLEMENT_SUBTRACT: 'ten_complement_subtract',
  CARRY:                   'carry',
  BORROW:                  'borrow',
  TWO_DIGIT_ADD:           'two_digit_add',
  TWO_DIGIT_SUBTRACT:      'two_digit_subtract',
  TWO_DIGIT_MIXED:         'two_digit_mixed',
  GHOST_MODE:              'ghost_mode',
  STILL_HANDS:             'still_hands',
  MENTAL_ONLY:             'mental_only',
};

/**
 * Per-skill mastery gates (from game-logic.md).
 * All four metrics must pass before a skill can become provisional/mastered.
 */
export const SKILL_GATES = {
  direct_add_1_4:           { minAttempts: 40,  minAccuracy: 95, maxLatencyMs: 2500,  maxSupportDependency: 5 },
  direct_subtract_1_4:      { minAttempts: 40,  minAccuracy: 95, maxLatencyMs: 2500,  maxSupportDependency: 5 },
  five_complement_add:      { minAttempts: 50,  minAccuracy: 90, maxLatencyMs: 3500,  maxSupportDependency: 3 },
  five_complement_subtract: { minAttempts: 50,  minAccuracy: 90, maxLatencyMs: 3500,  maxSupportDependency: 3 },
  ten_complement_add:       { minAttempts: 60,  minAccuracy: 90, maxLatencyMs: 4500,  maxSupportDependency: 3 },
  ten_complement_subtract:  { minAttempts: 60,  minAccuracy: 90, maxLatencyMs: 4500,  maxSupportDependency: 3 },
  carry:                    { minAttempts: 80,  minAccuracy: 90, maxLatencyMs: 5000,  maxSupportDependency: 1 },
  borrow:                   { minAttempts: 80,  minAccuracy: 90, maxLatencyMs: 5000,  maxSupportDependency: 1 },
  two_digit_add:            { minAttempts: 100, minAccuracy: 90, maxLatencyMs: 7000,  maxSupportDependency: 1 },
  two_digit_subtract:       { minAttempts: 100, minAccuracy: 90, maxLatencyMs: 7000,  maxSupportDependency: 1 },
  two_digit_mixed:          { minAttempts: 120, minAccuracy: 92, maxLatencyMs: 8000,  maxSupportDependency: 3 },
  ghost_mode:               { minAttempts: 100, minAccuracy: 90, maxLatencyMs: 8000,  maxSupportDependency: 0 },
  still_hands:              { minAttempts: 100, minAccuracy: 90, maxLatencyMs: 10000, maxSupportDependency: 0 },
  mental_only:              { minAttempts: 120, minAccuracy: 90, maxLatencyMs: 8000,  maxSupportDependency: 0 },
};

/** ms a skill must stay provisional before it can become mastered (~24 h) */
export const PROVISIONAL_HOLD_MS = 24 * 60 * 60 * 1000;

/** ms without practice before a mastered skill becomes rusty (14 days) */
export const RUSTY_THRESHOLD_MS = 14 * 24 * 60 * 60 * 1000;

/**
 * Max measured latency per attempt / per daily problem. If the user pauses
 * longer than this, the timer stops counting — protects stats from
 * walked-away-from-the-screen situations.
 */
export const LATENCY_PAUSE_CAP_MS = 30 * 1000;
