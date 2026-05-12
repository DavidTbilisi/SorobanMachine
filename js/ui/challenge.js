import {
  generateDailySet, evaluateDailyAnswer,
} from '../trainer/daily.js';
import {
  buildChallengeUrl, compareRuns,
} from '../trainer/challenge.js';
import { LATENCY_PAUSE_CAP_MS } from '../config.js';

// ── Initial state ────────────────────────────────────────────────────────────

export function createInitialChallengeState() {
  return {
    phase:      'idle',   // idle | invitation | playing | result | dismissed
    source:     null,     // { date, correct, total, totalMs, name }
    problems:   [],
    idx:        0,
    perAnswer:  [],
    questionStartedAt: null,
    myRun:      null,     // populated when finishing
  };
}

/** Non-active runtime state should never persist. */
export function serializableChallengeState() {
  return createInitialChallengeState();
}

// ── Views ────────────────────────────────────────────────────────────────────

export function challengeHTML(challenge) {
  switch (challenge.phase) {
    case 'invitation': return invitationHTML(challenge);
    case 'playing':    return playingHTML(challenge);
    case 'result':     return resultHTML(challenge);
    default:           return '';   // idle / dismissed → modal stays hidden
  }
}

function invitationHTML(c) {
  const s = c.source;
  return `<div class="ch-screen ch-invitation">
    <div class="ch-eyebrow">Soroban Machine · Friend Challenge</div>
    <h2 class="ch-title">${escapeHtml(s.name)} challenges you</h2>
    <p class="ch-sub">10 mental-math problems from the Daily of <strong>${s.date}</strong>.</p>

    <div class="ch-score-strip">
      <div class="ch-score-box">
        <div class="ch-score-num">${s.correct}/${s.total}</div>
        <div class="ch-score-label">${escapeHtml(s.name)}'s score</div>
        <div class="ch-score-time">${formatMs(s.totalMs)}</div>
      </div>
      <div class="ch-vs">vs</div>
      <div class="ch-score-box ch-score-pending">
        <div class="ch-score-num">?/${s.total}</div>
        <div class="ch-score-label">You</div>
        <div class="ch-score-time">—</div>
      </div>
    </div>

    <div class="ch-btn-row">
      <button id="ch-accept"  class="ch-btn ch-btn-primary">Accept · Play Now</button>
      <button id="ch-dismiss" class="ch-btn ch-btn-ghost">Maybe later</button>
    </div>
  </div>`;
}

function playingHTML(c) {
  const p = c.problems[c.idx];
  const total = c.problems.length;
  const pct = Math.round(100 * c.idx / total);
  return `<div class="ch-screen ch-stage" data-q="${c.idx}">
    <div class="ch-progress-bar"><div class="ch-progress-fill" style="width:${pct}%"></div></div>
    <div class="ch-progress-label">${c.idx + 1} / ${total} · vs ${escapeHtml(c.source.name)}</div>
    <p class="ch-prompt">${p.prompt}</p>
    <input type="text" inputmode="numeric" id="ch-answer" class="ch-answer" autocomplete="off" autofocus>
    <div class="pause-indicator" style="animation-delay:${LATENCY_PAUSE_CAP_MS}ms" aria-live="polite" role="status">
      <span class="pause-icon">⏸</span><span class="pause-text">Timer paused — your stats are safe</span>
    </div>
    <div class="ch-btn-row">
      <button id="ch-submit"  class="ch-btn ch-btn-primary">Submit [Enter]</button>
      <button id="ch-dismiss" class="ch-btn ch-btn-ghost">Abandon</button>
    </div>
  </div>`;
}

function resultHTML(c) {
  const mine = c.myRun;
  const them = c.source;
  if (!mine) return '';
  const outcome = compareRuns(mine, them);

  const headline =
    outcome === 'me'   ? `🏆 You beat ${escapeHtml(them.name)}!` :
    outcome === 'them' ? `${escapeHtml(them.name)} wins this round` :
                         `Dead heat with ${escapeHtml(them.name)} 🤝`;

  const grid = mine.perAnswer.map(a => a.correct ? '🟩' : '🟥').join(' ');

  return `<div class="ch-screen ch-result ch-${outcome}">
    <div class="ch-result-icon">${outcome === 'me' ? '🏆' : outcome === 'them' ? '🥈' : '🤝'}</div>
    <div class="ch-result-headline">${headline}</div>

    <div class="ch-score-strip">
      <div class="ch-score-box ${outcome === 'me' ? 'ch-score-winner' : ''}">
        <div class="ch-score-num">${mine.correct}/${mine.total}</div>
        <div class="ch-score-label">You</div>
        <div class="ch-score-time">${formatMs(mine.totalMs)}</div>
      </div>
      <div class="ch-vs">vs</div>
      <div class="ch-score-box ${outcome === 'them' ? 'ch-score-winner' : ''}">
        <div class="ch-score-num">${them.correct}/${them.total}</div>
        <div class="ch-score-label">${escapeHtml(them.name)}</div>
        <div class="ch-score-time">${formatMs(them.totalMs)}</div>
      </div>
    </div>

    <div class="ch-result-grid">${grid}</div>

    <div class="ch-btn-row">
      <button id="ch-challenge-back" class="ch-btn ch-btn-primary">🎯 Challenge ${escapeHtml(them.name)} back</button>
      <button id="ch-dismiss"        class="ch-btn">Done</button>
    </div>
  </div>`;
}

// ── Controller ───────────────────────────────────────────────────────────────

export function showInvitation(state, source, onChange) {
  state.challenge = {
    ...createInitialChallengeState(),
    phase: 'invitation',
    source,
  };
  onChange();
}

export function acceptChallenge(state, onChange) {
  const c = state.challenge;
  if (!c?.source) return;
  state.challenge = {
    ...c,
    phase:    'playing',
    problems: generateDailySet(c.source.date),
    idx:      0,
    perAnswer:[],
    questionStartedAt: Date.now(),
    myRun:    null,
  };
  onChange();
}

export function submitChallengeAnswer(state, rawInput, onChange) {
  const c = state.challenge;
  if (c.phase !== 'playing') return;
  const problem = c.problems[c.idx];
  const evalRes = evaluateDailyAnswer(rawInput, problem.expectedResult);
  const raw = Date.now() - (c.questionStartedAt ?? Date.now());
  const latencyMs = Math.min(Math.max(0, raw), LATENCY_PAUSE_CAP_MS);

  c.perAnswer = [...c.perAnswer, {
    correct: evalRes.correct, parsed: evalRes.parsed, expected: evalRes.expected, latencyMs,
  }];

  if (c.idx + 1 < c.problems.length) {
    c.idx++;
    c.questionStartedAt = Date.now();
  } else {
    const correct = c.perAnswer.filter(a => a.correct).length;
    const totalMs = c.perAnswer.reduce((sum, a) => sum + (a.latencyMs || 0), 0);
    c.myRun = {
      date: c.source.date,
      total: c.problems.length,
      correct,
      perAnswer: c.perAnswer.map(a => ({ correct: a.correct, latencyMs: a.latencyMs })),
      totalMs,
      finishedAt: Date.now(),
    };
    c.phase = 'result';
  }
  onChange();
}

export function dismissChallenge(state, onChange) {
  state.challenge = createInitialChallengeState();
  // Wipe the hash so it doesn't trigger again on reload.
  if (typeof window !== 'undefined' && window.history?.replaceState) {
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }
  onChange();
}

/** Build the "challenge back" URL for the recipient to share. */
export function buildChallengeBackUrl(state) {
  const c = state.challenge;
  if (!c?.myRun) return null;
  const base = window.location.origin + window.location.pathname;
  const name = state.profile?.name?.trim() || '';
  return buildChallengeUrl(base, c.myRun, name);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch]));
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
