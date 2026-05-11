import {
  skillSelectorHTML,
  skillTreeHTML,
  supportSelectorHTML,
  modeSelectorHTML,
  exercisePanelHTML,
  sorobanStateHTML,
  numberGridHTML,
  vizHTML,
  keyboardLegendHTML,
  hintsHTML,
  feedbackHTML,
  dashboardHTML,
  attemptLogHTML,
  provisionalNoticeHTML,
} from './views.js';
import { applyOperation } from '../engine/operations.js';
import { applyMultiColumnOperation } from '../engine/multicolumn.js';
import { isMentalOnlySkill } from '../trainer/exercises.js';
import { sequenceToLabels } from '../keyboard/shortcuts.js';

/** Full re-render. Used on init and reset. */
export function renderApp(state) {
  set('skill-container',   skillSelectorHTML(state.progress, state.selectedSkillId));
  set('support-container', supportSelectorHTML(state.supportLevel));
  set('mode-container',    modeSelectorHTML(state.inputMode));
  renderSkillTree(state);
  renderExercise(state);
  renderDashboard(state);
  renderAttemptLog(state);
}

export function renderSkillTree(state) {
  set('skill-tree-container', skillTreeHTML(state.progress, state.selectedSkillId));
}

/** Re-renders the full exercise area (panel + soroban + hints + sequence + feedback). */
export function renderExercise(state) {
  const numCols = state.currentExercise?.numCols ?? 1;
  set('exercise-container',  exercisePanelHTML(state));
  set('grid-container',      vizHTML(state.currentExercise, state.supportLevel, state.lastAttempt, state.vizMode));
  set('soroban-container',   sorobanStateHTML(state.currentExercise, state.lastAttempt, state.supportLevel, state.focusedCol));
  set('legend-container',    keyboardLegendHTML(state.inputMode, state.supportLevel, state.hintsVisible, numCols, state.currentExercise?.skillId));
  set('hints-container',     hintsHTML(state.currentExercise, state.supportLevel, state.hintsVisible));
  renderFeedback(state);
  set('provisional-container', provisionalNoticeHTML(state.selectedSkillId, state.progress));
  document.getElementById('answer-input')?.focus();
}

/** Re-renders only after a submit (disable input, reveal After bead, show feedback). */
export function renderAfterSubmit(state) {
  set('exercise-container', exercisePanelHTML(state));
  set('grid-container',     vizHTML(state.currentExercise, state.supportLevel, state.lastAttempt, state.vizMode));
  set('soroban-container',  sorobanStateHTML(state.currentExercise, state.lastAttempt, state.supportLevel, state.focusedCol));
  renderFeedback(state);
  set('provisional-container', provisionalNoticeHTML(state.selectedSkillId, state.progress));
}

/** Targeted re-render of just the visualization panel (when viz tab changes). */
export function renderViz(state) {
  set('grid-container', vizHTML(state.currentExercise, state.supportLevel, state.lastAttempt, state.vizMode));
}

/** Targeted re-render of just the soroban column focus indicator. */
export function renderFocusedCol(state) {
  set('soroban-container', sorobanStateHTML(state.currentExercise, state.lastAttempt, state.supportLevel, state.focusedCol));
}

/** Targeted update of the sequence chip display only (called on every token press). */
export function renderSequencePanel(state) {
  const labels = sequenceToLabels(state.inputSequence);
  const chips = labels.length
    ? labels.map(l => `<span class="token-chip">${l}</span>`).join(' ')
    : '<span class="seq-empty">—</span>';

  const liveEl = document.getElementById('sequence-live');
  if (liveEl) liveEl.innerHTML = chips;

  const builtEl = document.querySelector('.sequence-built');
  if (builtEl) builtEl.innerHTML = `<span class="seq-label">Sequence:</span> ${chips}`;
}

export function renderFeedback(state) {
  let transition = null;
  const ex = state.currentExercise;
  if (state.lastAttempt && ex && state.supportLevel < 3 && !isMentalOnlySkill(ex.skillId)) {
    const { startValue, direction, amount, numCols } = ex;
    transition = (numCols ?? 1) > 1
      ? applyMultiColumnOperation(startValue, direction, amount)
      : applyOperation(startValue, direction, amount);
  }
  set('feedback-container', feedbackHTML(state.lastAttempt, transition, state.supportLevel));
}

export function renderDashboard(state) {
  set('dashboard-container', dashboardHTML(state.progress));
}

export function renderAttemptLog(state) {
  set('log-container', attemptLogHTML(state.attemptLog));
}

function set(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}
