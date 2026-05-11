import { SHORTCUT_MAP } from '../keyboard/shortcuts.js';
import { isMentalOnlySkill } from '../trainer/exercises.js';

/**
 * @param {Object} handlers
 * @param {Function} getState  - returns current app state (live reference)
 */
export function bindEvents(handlers, getState) {
  document.addEventListener('click', e => {
    // ── App-mode tabs ────────────────────────────────────────────────────────
    const modeTab = e.target.closest('.mode-tab[data-mode]');
    if (modeTab?.dataset.mode) { handlers.onAppModeChange(modeTab.dataset.mode); return; }

    // ── Flash anzan controls ─────────────────────────────────────────────────
    const presetBtn = e.target.closest('[data-fa-start]');
    if (presetBtn?.dataset.faStart) { handlers.onFlashStart(presetBtn.dataset.faStart); return; }
    if (e.target.id === 'fa-submit') { handlers.onFlashSubmit(); return; }
    if (e.target.id === 'fa-replay') { handlers.onFlashReplay(); return; }
    if (e.target.id === 'fa-back')   { handlers.onFlashBack();   return; }
    if (e.target.id === 'fa-cancel') { handlers.onFlashBack();   return; }

    // ── Practice controls ────────────────────────────────────────────────────
    if (e.target.id === 'btn-submit') handlers.onSubmit();
    if (e.target.id === 'btn-next')   handlers.onNext();
    if (e.target.id === 'btn-reset')  handlers.onReset();
    if (e.target.id === 'btn-undo')   handlers.onUndo();

    const node = e.target.closest('.skill-node');
    if (node?.dataset.skillId) handlers.onSkillChange(node.dataset.skillId);

    const vizTab = e.target.closest('.viz-tab[data-viz]');
    if (vizTab?.dataset.viz) handlers.onVizChange(vizTab.dataset.viz);
  });

  document.addEventListener('change', e => {
    if (e.target.name === 'skill')       handlers.onSkillChange(e.target.value);
    if (e.target.id === 'support-level') handlers.onSupportChange(Number(e.target.value));
    if (e.target.name === 'input-mode')  handlers.onModeChange(e.target.value);
  });

  document.addEventListener('keydown', e => {
    const state = getState();

    // ── Flash anzan key handling (when active) ───────────────────────────────
    if (state.appMode === 'flash') {
      const phase = state.flashAnzan.phase;
      if (e.key === 'Escape') { e.preventDefault(); handlers.onFlashBack(); return; }
      if (phase === 'idle') {
        const map = { '1': 'easy', '2': 'medium', '3': 'hard', '4': 'extreme' };
        if (map[e.key]) { e.preventDefault(); handlers.onFlashStart(map[e.key]); return; }
        return;
      }
      if (phase === 'awaitingAnswer' && e.key === 'Enter') {
        e.preventDefault(); handlers.onFlashSubmit(); return;
      }
      if (phase === 'result' && e.key === 'Enter') {
        e.preventDefault(); handlers.onFlashReplay(); return;
      }
      return;  // swallow other keys during flash mode
    }

    const inAnswerInput = document.activeElement?.id === 'answer-input';
    const answered = !!state.lastAttempt;
    const isMental = isMentalOnlySkill(state.currentExercise?.skillId) || state.supportLevel === 3;
    const isReflex  = state.inputMode === 'reflex' && !isMental;

    // Tab: always toggle mode
    if (e.key === 'Tab') {
      e.preventDefault();
      handlers.onModeToggle();
      return;
    }

    // [ / ]: navigate between rods (always available when multi-col exercise loaded)
    if (e.key === '[') { handlers.onColLeft();  return; }
    if (e.key === ']') { handlers.onColRight(); return; }

    // H: toggle hints (not while typing)
    if ((e.key === 'h' || e.key === 'H') && !inAnswerInput) {
      handlers.onToggleHints();
      return;
    }

    // Space: advance to next exercise (not while typing)
    if (e.key === ' ' && !inAnswerInput) {
      e.preventDefault();
      handlers.onNext();
      return;
    }

    if (answered) return;

    if (isReflex) {
      const token = SHORTCUT_MAP[e.key.toLowerCase()];
      if (token) { e.preventDefault(); handlers.onAddToken(token); return; }
      if (e.key === 'Backspace') { e.preventDefault(); handlers.onUndo(); return; }
      if (e.key === 'Escape')    { handlers.onClearSequence(); return; }
      if (e.key === 'Enter')     { handlers.onSubmit(); return; }
    } else if (!isMental) {
      // Command mode
      if (e.key === 'Enter') {
        const input = document.getElementById('answer-input');
        const val   = input?.value?.trim() ?? '';
        if (val) { handlers.onAddCommandInput(val); }
        else     { handlers.onSubmit(); }
        return;
      }
      if (e.key === 'Escape') {
        const input = document.getElementById('answer-input');
        if (input?.value) { input.value = ''; }
        else              { handlers.onClearSequence(); }
        return;
      }
      if (e.key === 'Backspace' && !inAnswerInput) {
        e.preventDefault();
        handlers.onUndo();
        return;
      }
    } else {
      // Mental / support-level-3 mode
      if (e.key === 'Enter') { handlers.onSubmit(); return; }
      if (e.key === 'Escape') {
        const input = document.getElementById('answer-input');
        if (input) input.value = '';
        return;
      }
    }
  });
}
