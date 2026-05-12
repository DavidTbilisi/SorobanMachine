import {
  PRESETS, PRESET_ORDER,
  generateFlashSequence, evaluateFlashAnswer, updateFlashStats,
  createInitialFlashStats,
} from '../trainer/flashAnzan.js';
import { playTick } from './sound.js';

// ── Initial state ────────────────────────────────────────────────────────────

export function createInitialFlashAnzanState() {
  return {
    phase:           'idle',  // idle | countdown | flashing | awaitingAnswer | result
    presetKey:       null,
    config:          null,
    numbers:         [],
    expectedSum:     0,
    currentIndex:    0,
    currentNumber:   null,
    flashOn:         true,
    countdownValue:  0,
    lastResult:      null,
    stats:           createInitialFlashStats(),
    timers:          [],
  };
}

/** Strip runtime/non-serializable fields before saving. */
export function serializableFlashAnzanState(fa) {
  return {
    phase:      'idle',
    presetKey:  null,
    config:     null,
    numbers:    [],
    expectedSum: 0,
    currentIndex: 0,
    currentNumber: null,
    flashOn:    true,
    countdownValue: 0,
    lastResult: null,
    stats:      fa?.stats ?? createInitialFlashStats(),
    timers:     [],
  };
}

// ── Views ────────────────────────────────────────────────────────────────────

export function flashAnzanHTML(fa) {
  switch (fa.phase) {
    case 'countdown':       return countdownHTML(fa);
    case 'flashing':        return flashingHTML(fa);
    case 'awaitingAnswer':  return inputHTML(fa);
    case 'result':          return resultHTML(fa);
    default:                return idleHTML(fa);
  }
}

function idleHTML(fa) {
  const presets = PRESET_ORDER.map(key => {
    const p  = PRESETS[key];
    const st = fa.stats[key] ?? { played: 0, correct: 0, bestStreak: 0 };
    const acc = st.played ? Math.round(100 * st.correct / st.played) : null;
    const statLine = st.played
      ? `${acc}% · best streak ${st.bestStreak}`
      : 'Not played yet';
    return `<button class="fa-preset" data-fa-start="${key}">
      <div class="fa-preset-name">${p.label}</div>
      <div class="fa-preset-cfg">${p.count} numbers · ${p.digits}-digit · ${p.speedMs}ms</div>
      <div class="fa-preset-stat">${statLine}</div>
    </button>`;
  }).join('');

  return `<div class="fa-screen fa-idle">
    <h2 class="fa-title">Flash Anzan</h2>
    <p class="fa-sub">Numbers flash one by one. Add them in your head. Enter the sum.</p>
    <div class="fa-presets">${presets}</div>
    <p class="fa-hint">Tip: press <kbd>1</kbd>–<kbd>4</kbd> to start. Press <kbd>Esc</kbd> any time to stop.</p>
  </div>`;
}

function countdownHTML(fa) {
  const label = fa.countdownValue > 0 ? String(fa.countdownValue) : 'Go!';
  return `<div class="fa-screen fa-stage">
    <div class="fa-countdown">${label}</div>
    <button id="fa-cancel" class="fa-btn fa-btn-ghost">Cancel</button>
  </div>`;
}

function flashingHTML(fa) {
  const text = fa.flashOn && fa.currentNumber != null ? String(fa.currentNumber) : '';
  return `<div class="fa-screen fa-stage">
    <div id="fa-current-number" class="fa-number${fa.flashOn ? '' : ' fa-blank'}">${text}</div>
    <div class="fa-progress" id="fa-progress">${fa.currentIndex + 1} / ${fa.numbers.length}</div>
    <button id="fa-cancel" class="fa-btn fa-btn-ghost">Cancel</button>
  </div>`;
}

function inputHTML(fa) {
  return `<div class="fa-screen fa-stage fa-stage-input">
    <p class="fa-question">Sum = ?</p>
    <input type="text" inputmode="numeric" id="fa-answer" class="fa-answer" autocomplete="off" autofocus>
    <div class="fa-btn-row">
      <button id="fa-submit" class="fa-btn fa-btn-primary">Submit</button>
      <button id="fa-back"   class="fa-btn">Back</button>
    </div>
  </div>`;
}

function resultHTML(fa) {
  const r = fa.lastResult ?? {};
  const ok = !!r.correct;
  const presetLabel = fa.config?.label ?? '';
  const st = fa.stats[fa.presetKey] ?? {};
  const acc = st.played ? Math.round(100 * st.correct / st.played) : 0;

  return `<div class="fa-screen fa-result ${ok ? 'fa-correct' : 'fa-incorrect'}">
    <div class="fa-result-icon">${ok ? '✓' : '✗'}</div>
    <div class="fa-result-text">${ok ? 'Correct!' : 'Not quite'}</div>
    <div class="fa-result-detail">
      Sum: <strong>${r.expected}</strong>${!ok && r.parsed != null ? `&nbsp;&nbsp;You: <strong>${r.parsed}</strong>` : ''}
    </div>
    <div class="fa-recap">${fa.numbers.join('  +  ')}<span class="fa-recap-eq">  =  ${r.expected}</span></div>
    <div class="fa-meta">${presetLabel} · streak ${st.streak} · ${acc}% over ${st.played}</div>
    <div class="fa-btn-row">
      <button id="fa-replay" class="fa-btn fa-btn-primary">Try again [Enter]</button>
      <button data-share="flash" class="fa-btn">📋 Share</button>
      <button id="fa-back"   class="fa-btn">Change settings</button>
    </div>
  </div>`;
}

// ── Controller ───────────────────────────────────────────────────────────────
// Drives the flash anzan state machine and schedules animation timers.
// `onChange()` is called whenever a re-render is required.

export function startFlashRound(state, presetKey, onChange) {
  const preset = PRESETS[presetKey];
  if (!preset) return;
  cancelTimers(state);

  const { numbers, sum } = generateFlashSequence(preset);
  state.flashAnzan = {
    ...state.flashAnzan,
    phase:          'countdown',
    presetKey,
    config:         preset,
    numbers,
    expectedSum:    sum,
    currentIndex:   0,
    currentNumber:  null,
    flashOn:        true,
    countdownValue: 3,
    lastResult:     null,
    timers:         [],
  };
  onChange();
  runCountdown(state, onChange);
}

function runCountdown(state, onChange) {
  const fa = state.flashAnzan;
  const tick = (n) => {
    if (state.flashAnzan.phase !== 'countdown') return;
    state.flashAnzan.countdownValue = n;
    onChange();
    if (n > 0) {
      schedule(state, () => tick(n - 1), 650);
    } else {
      schedule(state, () => beginFlashing(state, onChange), 500);
    }
  };
  tick(fa.countdownValue);
}

function beginFlashing(state, onChange) {
  if (state.flashAnzan.phase !== 'countdown') return;
  state.flashAnzan.phase = 'flashing';
  state.flashAnzan.currentIndex = 0;
  showNext(state, onChange, /*firstRender*/ true);
}

function showNext(state, onChange, firstRender) {
  const fa = state.flashAnzan;
  if (fa.phase !== 'flashing') return;

  if (fa.currentIndex >= fa.numbers.length) {
    fa.phase = 'awaitingAnswer';
    onChange();
    // focus is set when input renders (autofocus attribute)
    return;
  }

  fa.currentNumber = fa.numbers[fa.currentIndex];
  fa.flashOn = true;
  playTick();

  // First render of flashing phase needs a full re-render to swap HTML.
  // Subsequent ticks mutate the number element directly to avoid flicker.
  if (firstRender) {
    onChange();
  } else {
    updateFlashDOM(fa);
  }

  const onMs  = Math.max(120, Math.round(fa.config.speedMs * 0.78));
  const offMs = Math.max(60,  Math.round(fa.config.speedMs * 0.22));

  schedule(state, () => {
    if (state.flashAnzan.phase !== 'flashing') return;
    state.flashAnzan.flashOn = false;
    updateFlashDOM(state.flashAnzan);

    schedule(state, () => {
      if (state.flashAnzan.phase !== 'flashing') return;
      state.flashAnzan.currentIndex++;
      showNext(state, onChange, false);
    }, offMs);
  }, onMs);
}

function updateFlashDOM(fa) {
  const numEl = document.getElementById('fa-current-number');
  if (numEl) {
    numEl.textContent = fa.flashOn && fa.currentNumber != null ? String(fa.currentNumber) : '';
    numEl.classList.toggle('fa-blank', !fa.flashOn);
  }
  const progEl = document.getElementById('fa-progress');
  if (progEl) progEl.textContent = `${fa.currentIndex + 1} / ${fa.numbers.length}`;
}

export function submitFlashAnswer(state, rawInput, onChange) {
  const fa = state.flashAnzan;
  if (fa.phase !== 'awaitingAnswer') return;
  const result = evaluateFlashAnswer(rawInput, fa.expectedSum);
  fa.lastResult = result;
  fa.stats = updateFlashStats(fa.stats, fa.presetKey, result.correct);
  fa.phase = 'result';
  onChange();
}

export function replayFlash(state, onChange) {
  const key = state.flashAnzan.presetKey;
  if (!key) return backToFlashIdle(state, onChange);
  startFlashRound(state, key, onChange);
}

export function backToFlashIdle(state, onChange) {
  cancelTimers(state);
  state.flashAnzan = {
    ...state.flashAnzan,
    phase:          'idle',
    presetKey:      null,
    config:         null,
    numbers:        [],
    expectedSum:    0,
    currentIndex:   0,
    currentNumber:  null,
    flashOn:        true,
    countdownValue: 0,
    lastResult:     null,
    timers:         [],
  };
  onChange();
}

export function cancelTimers(state) {
  const fa = state.flashAnzan;
  if (!fa?.timers?.length) return;
  fa.timers.forEach(clearTimeout);
  fa.timers = [];
}

function schedule(state, fn, ms) {
  const id = setTimeout(fn, ms);
  state.flashAnzan.timers.push(id);
}
