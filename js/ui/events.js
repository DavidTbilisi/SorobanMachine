/**
 * Registers all app event listeners via delegation.
 * @param {Object} handlers - { onSubmit, onNext, onReset, onSkillChange, onSupportChange }
 */
export function bindEvents(handlers) {
  document.addEventListener('click', e => {
    if (e.target.id === 'btn-submit') handlers.onSubmit();
    if (e.target.id === 'btn-next')   handlers.onNext();
    if (e.target.id === 'btn-reset')  handlers.onReset();
  });

  document.addEventListener('change', e => {
    if (e.target.name === 'skill')         handlers.onSkillChange(e.target.value);
    if (e.target.id === 'support-level')   handlers.onSupportChange(Number(e.target.value));
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      handlers.onSubmit();
    } else if (e.key === ' ' && e.target.id !== 'answer-input') {
      e.preventDefault();
      handlers.onNext();
    } else if (e.key === 'Escape') {
      const input = document.getElementById('answer-input');
      if (input) input.value = '';
    }
  });
}
