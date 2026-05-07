import { createInitialAppState, resetAppState } from './state.js';
import { loadAppState, saveAppState, clearAppState } from './storage.js';
import { generateExercise, isMentalOnlySkill } from './trainer/exercises.js';
import { evaluateAnswerNumeric, evaluateAnswerSequence } from './trainer/scoring.js';
import { updateProgress, unlockEligibleSkills, applyRustyDecay, migrateLockedToLearning } from './trainer/progress.js';
import { canMasterSkill } from './trainer/gates.js';
import { STATUS, PROVISIONAL_HOLD_MS } from './config.js';
import { applyOperation } from './engine/operations.js';
import { applyMultiColumnOperation } from './engine/multicolumn.js';
import {
  renderApp, renderAfterSubmit, renderExercise,
  renderDashboard, renderAttemptLog, renderSequencePanel, renderFocusedCol,
} from './ui/render.js';
import { bindEvents } from './ui/events.js';

let state = loadAppState() ?? createInitialAppState();

// Hydrate fields that may be missing from a saved state
state.inputMode     ??= 'command';
state.inputSequence ??= [];
state.hintsVisible  ??= true;
state.focusedCol    ??= 0;

state.progress = migrateLockedToLearning(state.progress);
state.progress = applyRustyDecay(state.progress);

// ── Status transitions ────────────────────────────────────────────────────────

function applyStatusTransitions() {
  const id = state.selectedSkillId;
  const p  = state.progress[id];

  if (p.status === STATUS.LEARNING && canMasterSkill(id, state.progress)) {
    state.progress[id] = { ...p, status: STATUS.PROVISIONAL, provisionalSince: Date.now() };

  } else if (p.status === STATUS.PROVISIONAL && canMasterSkill(id, state.progress)) {
    const held = Date.now() - (p.provisionalSince ?? Date.now());
    if (held >= PROVISIONAL_HOLD_MS) {
      state.progress[id] = { ...p, status: STATUS.MASTERED, provisionalSince: null };
      state.progress = unlockEligibleSkills(state.progress);
    }

  } else if ((p.status === STATUS.PROVISIONAL || p.status === STATUS.RUSTY) && !canMasterSkill(id, state.progress)) {
    state.progress[id] = { ...p, status: STATUS.LEARNING, provisionalSince: null };
  }

  state.progress = applyRustyDecay(state.progress);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function isMentalMode() {
  return isMentalOnlySkill(state.currentExercise?.skillId) || state.supportLevel === 3;
}

function getTransition() {
  const { startValue, direction, amount, numCols } = state.currentExercise;
  return (numCols ?? 1) > 1
    ? applyMultiColumnOperation(startValue, direction, amount)
    : applyOperation(startValue, direction, amount);
}

function parseCommandInput(raw) {
  const parts = raw.split(/[,\s]+/).filter(Boolean);
  const tokens = [];
  for (const part of parts) {
    const m = part.match(/^([+\-−])(\d+)$/);
    if (!m) return null;
    const direction = m[1] === '+' ? 'add' : 'subtract';
    const amount    = parseInt(m[2], 10);
    if (amount === 0) return null;
    tokens.push({ direction, amount, col: state.focusedCol });
  }
  return tokens.length ? tokens : null;
}

// ── Event handlers ────────────────────────────────────────────────────────────

function onSubmit() {
  if (!state.currentExercise || state.lastAttempt) return;

  let attempt;

  if (isMentalMode()) {
    const input = document.getElementById('answer-input');
    const userInput = input?.value?.trim() ?? '';
    if (!userInput) return;
    attempt = evaluateAnswerNumeric(userInput, state.currentExercise, state.supportLevel, state.exerciseStartTime);
  } else {
    if (!state.inputSequence.length) return;
    attempt = evaluateAnswerSequence(
      state.inputSequence, state.currentExercise, getTransition(),
      state.supportLevel, state.exerciseStartTime,
    );
  }

  state.lastAttempt = attempt;
  state.attemptLog.push(attempt);
  state.progress = updateProgress(state.progress, attempt);

  applyStatusTransitions();
  saveAppState(state);

  renderAfterSubmit(state);
  renderDashboard(state);
  renderAttemptLog(state);
}

function onNext() {
  try {
    state.currentExercise = generateExercise(state.selectedSkillId);
  } catch (err) {
    alert(err.message);
    return;
  }
  state.exerciseStartTime = Date.now();
  state.lastAttempt       = null;
  state.inputSequence     = [];
  state.focusedCol        = 0;
  saveAppState(state);
  renderExercise(state);
}

function onReset() {
  if (!confirm('Reset all progress? This cannot be undone.')) return;
  clearAppState();
  state = resetAppState();
  renderApp(state);
}

function onSkillChange(skillId) {
  state.selectedSkillId = skillId;
  state.currentExercise = null;
  state.lastAttempt     = null;
  state.inputSequence   = [];
  state.focusedCol      = 0;
  saveAppState(state);
  renderExercise(state);
}

function onSupportChange(level) {
  state.supportLevel  = level;
  state.inputSequence = [];
  state.focusedCol    = 0;
  saveAppState(state);
  renderExercise(state);
}

function onModeChange(mode) {
  state.inputMode     = mode;
  state.inputSequence = [];
  saveAppState(state);
  renderExercise(state);
}

function onModeToggle() {
  onModeChange(state.inputMode === 'command' ? 'reflex' : 'command');
}

function onToggleHints() {
  state.hintsVisible = !state.hintsVisible;
  saveAppState(state);
  renderExercise(state);
}

function onAddToken(token) {
  if (state.lastAttempt || !state.currentExercise) return;
  state.inputSequence = [...state.inputSequence, { ...token, col: state.focusedCol }];
  renderSequencePanel(state);
}

function onUndo() {
  if (state.lastAttempt || !state.inputSequence.length) return;
  state.inputSequence = state.inputSequence.slice(0, -1);
  renderSequencePanel(state);
}

function onClearSequence() {
  if (state.lastAttempt) return;
  state.inputSequence = [];
  renderSequencePanel(state);
}

function onAddCommandInput(raw) {
  const tokens = parseCommandInput(raw);
  if (!tokens) return;
  state.inputSequence = [...state.inputSequence, ...tokens];
  const input = document.getElementById('answer-input');
  if (input) input.value = '';
  renderSequencePanel(state);
}

function onColLeft() {
  const numCols = state.currentExercise?.numCols ?? 1;
  if (state.focusedCol < numCols - 1) {
    state.focusedCol++;
    renderFocusedCol(state);
  }
}

function onColRight() {
  if (state.focusedCol > 0) {
    state.focusedCol--;
    renderFocusedCol(state);
  }
}

// ── Boot ──────────────────────────────────────────────────────────────────────

bindEvents(
  {
    onSubmit, onNext, onReset, onSkillChange, onSupportChange,
    onModeChange, onModeToggle, onToggleHints,
    onAddToken, onUndo, onClearSequence, onAddCommandInput,
    onColLeft, onColRight,
  },
  () => state,
);

renderApp(state);
