import { createInitialAppState, resetAppState } from './state.js';
import { loadAppState, saveAppState, clearAppState } from './storage.js';
import { generateExercise } from './trainer/exercises.js';
import { evaluateAnswer } from './trainer/scoring.js';
import { updateProgress, unlockEligibleSkills, applyRustyDecay } from './trainer/progress.js';
import { canMasterSkill } from './trainer/gates.js';
import { STATUS, PROVISIONAL_HOLD_MS } from './config.js';
import { renderApp, renderAfterSubmit, renderExercise, renderDashboard, renderAttemptLog } from './ui/render.js';
import { bindEvents } from './ui/events.js';

let state = loadAppState() ?? createInitialAppState();

// Apply rusty decay on startup (skill may have decayed while app was closed)
state.progress = applyRustyDecay(state.progress);

// ── Status transitions ────────────────────────────────────────────────────────

function applyStatusTransitions() {
  const id = state.selectedSkillId;
  const p = state.progress[id];

  if (p.status === STATUS.LEARNING && canMasterSkill(id, state.progress)) {
    // Gate passed for the first time → provisional
    state.progress[id] = { ...p, status: STATUS.PROVISIONAL, provisionalSince: Date.now() };

  } else if (p.status === STATUS.PROVISIONAL && canMasterSkill(id, state.progress)) {
    // Already provisional — check if 24 h have elapsed
    const held = Date.now() - (p.provisionalSince ?? Date.now());
    if (held >= PROVISIONAL_HOLD_MS) {
      state.progress[id] = { ...p, status: STATUS.MASTERED, provisionalSince: null };
      state.progress = unlockEligibleSkills(state.progress);
    }

  } else if ((p.status === STATUS.PROVISIONAL || p.status === STATUS.RUSTY) && !canMasterSkill(id, state.progress)) {
    // Stats slipped below gate while provisional/rusty → back to learning
    state.progress[id] = { ...p, status: STATUS.LEARNING, provisionalSince: null };
  }

  state.progress = applyRustyDecay(state.progress);
}

// ── Event handlers ────────────────────────────────────────────────────────────

function onSubmit() {
  const input = document.getElementById('answer-input');
  if (!input || !state.currentExercise || state.lastAttempt) return;

  const userInput = input.value.trim();
  if (!userInput) return;

  const attempt = evaluateAnswer(userInput, state.currentExercise, state.supportLevel, state.exerciseStartTime);
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
  state.lastAttempt = null;
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
  state.lastAttempt = null;
  saveAppState(state);
  renderExercise(state);
}

function onSupportChange(level) {
  state.supportLevel = level;
  saveAppState(state);
  renderExercise(state);
}

// ── Boot ──────────────────────────────────────────────────────────────────────

bindEvents({ onSubmit, onNext, onReset, onSkillChange, onSupportChange });
renderApp(state);
