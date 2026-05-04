import {
  skillSelectorHTML,
  supportSelectorHTML,
  modeSelectorHTML,
  exercisePanelHTML,
  sorobanStateHTML,
  keyboardLegendHTML,
  hintsHTML,
  feedbackHTML,
  dashboardHTML,
  attemptLogHTML,
  provisionalNoticeHTML,
  sequencePanelHTML,
} from './views.js';
import { applyOperation } from '../engine/operations.js';
import { SKILL_IDS } from '../config.js';

/** Full re-render. Used on init and reset. */
export function renderApp(state) {
  set('skill-container',   skillSelectorHTML(state.progress, state.selectedSkillId));
  set('support-container', supportSelectorHTML(state.supportLevel));
  set('mode-container',    modeSelectorHTML(state.inputMode));
  renderExercise(state);
  renderDashboard(state);
  renderAttemptLog(state);
}

/** Re-renders the full exercise area (panel + soroban + hints + sequence + feedback). */
export function renderExercise(state) {
  set('exercise-container',  exercisePanelHTML(state));
  set('soroban-container',   sorobanStateHTML(state.currentExercise, state.lastAttempt, state.supportLevel));
  set('legend-container',    keyboardLegendHTML(state.inputMode, state.supportLevel, state.hintsVisible));
  set('hints-container',     hintsHTML(state.currentExercise, state.supportLevel, state.hintsVisible));
  renderFeedback(state);
  set('provisional-container', provisionalNoticeHTML(state.selectedSkillId, state.progress));
  document.getElementById('answer-input')?.focus();
}

/** Re-renders only after a submit (disable input, reveal After bead, show feedback). */
export function renderAfterSubmit(state) {
  set('exercise-container', exercisePanelHTML(state));
  set('soroban-container',  sorobanStateHTML(state.currentExercise, state.lastAttempt, state.supportLevel));
  renderFeedback(state);
  set('provisional-container', provisionalNoticeHTML(state.selectedSkillId, state.progress));
}

/** Targeted update of the sequence chip display only (called on every token press). */
export function renderSequencePanel(state) {
  const isMental = state.currentExercise?.skillId === SKILL_IDS.MENTAL_ONLY || state.supportLevel === 3;

  // In reflex mode the sequence lives inside #sequence-live (inside exercise-container)
  const liveEl = document.getElementById('sequence-live');
  if (liveEl) {
    const { sequenceToLabels } = require_sequenceToLabels(); // avoid circular; inline:
    import('../keyboard/shortcuts.js').then(({ sequenceToLabels }) => {
      const labels = sequenceToLabels(state.inputSequence);
      liveEl.innerHTML = labels.length
        ? labels.map(l => `<span class="token-chip">${l}</span>`).join(' ')
        : '<span class="seq-empty">—</span>';
    });
  }

  // In command mode the sequence lives in .sequence-built (also inside exercise-container)
  const builtEl = document.querySelector('.sequence-built');
  if (builtEl) {
    import('../keyboard/shortcuts.js').then(({ sequenceToLabels }) => {
      const labels = sequenceToLabels(state.inputSequence);
      const chips = labels.length
        ? labels.map(l => `<span class="token-chip">${l}</span>`).join(' ')
        : '<span class="seq-empty">—</span>';
      builtEl.innerHTML = `<span class="seq-label">Sequence:</span> ${chips}`;
    });
  }
}

export function renderFeedback(state) {
  let transition = null;
  if (state.lastAttempt && state.currentExercise && state.supportLevel < 3) {
    const { startValue, direction, amount } = state.currentExercise;
    transition = applyOperation(startValue, direction, amount);
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
