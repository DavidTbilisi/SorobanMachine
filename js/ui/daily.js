import {
  DAILY_SET_SIZE,
  dateKey,
  generateDailySet,
  evaluateDailyAnswer,
  createInitialDailyState,
  serializableDailyState,
  computeStreak,
  finalizeRun,
} from '../trainer/daily.js';
import { LATENCY_PAUSE_CAP_MS } from '../config.js';

export { createInitialDailyState, serializableDailyState };

// ── Views ────────────────────────────────────────────────────────────────────

export function dailyHTML(daily) {
  switch (daily.phase) {
    case 'playing': return playingHTML(daily);
    case 'result':  return resultHTML(daily);
    default:        return idleHTML(daily);
  }
}

function idleHTML(daily) {
  const today    = dateKey();
  const todayRes = daily.results[today];
  const { current, longest } = computeStreak(daily.results, today);

  const playedCount = Object.keys(daily.results).length;
  const startLabel  = todayRes ? 'Play again' : "Start Today's Challenge";

  const todayLine = todayRes
    ? `Today: <strong>${todayRes.correct}/${todayRes.total}</strong> · ${formatMs(todayRes.totalMs)}`
    : `Today's set is locked in — same problems for everyone, every day.`;

  return `<div class="dc-screen dc-idle">
    <h2 class="dc-title">Daily Challenge</h2>
    <p class="dc-sub">${DAILY_SET_SIZE} mental-math problems. Same for every player today.</p>

    <div class="dc-stat-row">
      <div class="dc-stat"><div class="dc-stat-value">${current}</div><div class="dc-stat-label">Streak 🔥</div></div>
      <div class="dc-stat"><div class="dc-stat-value">${longest}</div><div class="dc-stat-label">Longest</div></div>
      <div class="dc-stat"><div class="dc-stat-value">${playedCount}</div><div class="dc-stat-label">Days played</div></div>
    </div>

    <p class="dc-today">${todayLine}</p>

    <button id="dc-start" class="dc-btn dc-btn-primary">${startLabel}</button>

    ${calendarStripHTML(daily.results, today)}
  </div>`;
}

function calendarStripHTML(results, today) {
  const days = 14;
  const cells = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = shiftDayKey(today, -i);
    const r = results[d];
    let cls = 'dc-cell';
    let label = d.slice(5);  // MM-DD
    if (r) {
      const ratio = r.correct / r.total;
      cls += ratio === 1 ? ' dc-cell-perfect' : ratio >= 0.6 ? ' dc-cell-pass' : ' dc-cell-miss';
    } else if (d === today) {
      cls += ' dc-cell-today';
    } else {
      cls += ' dc-cell-empty';
    }
    const tip = r ? `${d}: ${r.correct}/${r.total}` : (d === today ? `${d}: not played yet` : `${d}: skipped`);
    cells.push(`<div class="${cls}" title="${tip}"><span>${label}</span></div>`);
  }
  return `<div class="dc-calendar" aria-label="Last 14 days">${cells.join('')}</div>`;
}

function playingHTML(daily) {
  const p = daily.problems[daily.idx];
  const total = daily.problems.length;
  const pct = Math.round(100 * daily.idx / total);
  // Per-question key forces the animation to restart between problems.
  return `<div class="dc-screen dc-stage" data-q="${daily.idx}">
    <div class="dc-progress-bar"><div class="dc-progress-fill" style="width:${pct}%"></div></div>
    <div class="dc-progress-label">${daily.idx + 1} / ${total}</div>
    <p class="dc-prompt">${p.prompt}</p>
    <input type="text" inputmode="numeric" id="dc-answer" class="dc-answer" autocomplete="off" autofocus>
    ${pauseIndicatorHTML()}
    <div class="dc-btn-row">
      <button id="dc-submit" class="dc-btn dc-btn-primary">Submit [Enter]</button>
      <button id="dc-back"   class="dc-btn dc-btn-ghost">Abandon</button>
    </div>
  </div>`;
}

function pauseIndicatorHTML() {
  return `<div class="pause-indicator" style="animation-delay:${LATENCY_PAUSE_CAP_MS}ms"
              aria-live="polite" role="status">
    <span class="pause-icon">⏸</span>
    <span class="pause-text">Timer paused — your stats are safe</span>
  </div>`;
}

function resultHTML(daily) {
  const run = daily.results[daily.date];
  if (!run) return idleHTML(daily);

  const { current, longest } = computeStreak(daily.results, daily.date);
  const grid = run.perAnswer.map(a => a.correct ? '🟩' : '🟥').join(' ');
  const avgMs = Math.round(run.totalMs / run.total);
  const ok = run.correct === run.total;

  return `<div class="dc-screen dc-result ${ok ? 'dc-perfect' : ''}">
    <div class="dc-result-icon">${ok ? '🏆' : run.correct >= run.total * 0.6 ? '✓' : '·'}</div>
    <div class="dc-result-score">${run.correct} / ${run.total}</div>
    <div class="dc-result-grid">${grid}</div>
    <div class="dc-result-meta">
      ${formatMs(run.totalMs)} total · ~${formatMs(avgMs)} / problem
    </div>
    <div class="dc-stat-row dc-stat-row-compact">
      <div class="dc-stat"><div class="dc-stat-value">${current}</div><div class="dc-stat-label">Streak 🔥</div></div>
      <div class="dc-stat"><div class="dc-stat-value">${longest}</div><div class="dc-stat-label">Longest</div></div>
    </div>
    <div class="dc-btn-row">
      <button data-share="daily" class="dc-btn">📋 Share result</button>
      <button id="dc-challenge" class="dc-btn dc-btn-primary">🎯 Challenge a friend</button>
      <button id="dc-back" class="dc-btn">Done</button>
    </div>
  </div>`;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function shiftDayKey(dateStr, delta) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + delta);
  return dateKey(dt);
}

function formatMs(ms) {
  if (!Number.isFinite(ms) || ms < 0) return '–';
  if (ms < 1000) return `${ms}ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(s < 10 ? 1 : 0)}s`;
  const m = Math.floor(s / 60);
  const rem = Math.round(s - m * 60);
  return `${m}m ${rem}s`;
}

// ── Controller ───────────────────────────────────────────────────────────────

export function startDailyRun(state, onChange) {
  const today = dateKey();
  state.daily = {
    ...state.daily,
    phase:             'playing',
    date:              today,
    problems:          generateDailySet(today),
    idx:               0,
    perAnswer:         [],
    questionStartedAt: Date.now(),
    runStartedAt:      Date.now(),
  };
  onChange();
}

export function submitDailyAnswer(state, rawInput, onChange) {
  const d = state.daily;
  if (d.phase !== 'playing') return;
  const problem = d.problems[d.idx];
  const evalRes = evaluateDailyAnswer(rawInput, problem.expectedResult);
  const raw = Date.now() - (d.questionStartedAt ?? Date.now());
  // Cap idle gaps — if the user walked away, the clock stops at 30s.
  const latencyMs = Math.min(Math.max(0, raw), LATENCY_PAUSE_CAP_MS);

  d.perAnswer = [...d.perAnswer, {
    correct: evalRes.correct, parsed: evalRes.parsed, expected: evalRes.expected, latencyMs,
  }];

  if (d.idx + 1 < d.problems.length) {
    d.idx++;
    d.questionStartedAt = Date.now();
  } else {
    const run = finalizeRun(d);
    d.results = { ...d.results, [run.date]: run };
    d.phase = 'result';
  }
  onChange();
}

export function backToDailyIdle(state, onChange) {
  state.daily = { ...state.daily, phase: 'idle', problems: [], idx: 0, perAnswer: [], questionStartedAt: null, runStartedAt: null };
  onChange();
}
