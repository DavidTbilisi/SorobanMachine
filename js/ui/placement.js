import {
  buildPlacementProblems, evaluatePlacementAnswer, classifyPlacement,
  PLACEMENT_SET_SIZE,
} from '../trainer/placement.js';
import { LATENCY_PAUSE_CAP_MS } from '../config.js';

export function createInitialPlacementState() {
  return {
    phase:    'idle',   // idle | invitation | playing | result
    problems: [],
    idx:      0,
    perAnswer: [],
    questionStartedAt: null,
    result:   null,     // populated when classified
  };
}

export function serializablePlacementState(p) {
  return { ...createInitialPlacementState(), result: p?.result ?? null };
}

// ── Views ────────────────────────────────────────────────────────────────────

export function placementHTML(placement) {
  switch (placement.phase) {
    case 'invitation': return invitationHTML(placement);
    case 'playing':    return playingHTML(placement);
    case 'result':     return resultHTML(placement);
    default:           return '';
  }
}

function invitationHTML() {
  return `<div class="pl-screen pl-invitation">
    <div class="pl-eyebrow">Soroban Machine · Placement Test</div>
    <h2 class="pl-title">Where should you start?</h2>
    <p class="pl-sub">
      ${PLACEMENT_SET_SIZE} mental-math problems ramping from basic beads to
      mixed two-digit. Takes ~3 minutes. Tells you which skill in the tree
      to begin with.
    </p>
    <ul class="pl-checklist">
      <li>Type the final answer for each problem</li>
      <li>Mistakes are fine — the test calibrates around them</li>
      <li>30s idle cap, just like Daily</li>
    </ul>
    <div class="pl-btn-row">
      <button id="pl-start"   class="pl-btn pl-btn-primary">Start the test</button>
      <button id="pl-dismiss" class="pl-btn pl-btn-ghost">Maybe later</button>
    </div>
  </div>`;
}

function playingHTML(p) {
  const problem = p.problems[p.idx];
  const total = p.problems.length;
  const pct = Math.round(100 * p.idx / total);
  return `<div class="pl-screen pl-stage" data-q="${p.idx}">
    <div class="pl-progress-bar"><div class="pl-progress-fill" style="width:${pct}%"></div></div>
    <div class="pl-progress-label">${p.idx + 1} / ${total} · ${escapeHtml(problem.band)}</div>
    <p class="pl-prompt">${problem.prompt}</p>
    <input type="text" inputmode="numeric" id="pl-answer" class="pl-answer" autocomplete="off" autofocus>
    <div class="pause-indicator" style="animation-delay:${LATENCY_PAUSE_CAP_MS}ms" aria-live="polite" role="status">
      <span class="pause-icon">⏸</span><span class="pause-text">Timer paused — your stats are safe</span>
    </div>
    <div class="pl-btn-row">
      <button id="pl-submit"  class="pl-btn pl-btn-primary">Submit [Enter]</button>
      <button id="pl-dismiss" class="pl-btn pl-btn-ghost">Abandon</button>
    </div>
  </div>`;
}

function resultHTML(p) {
  const r = p.result;
  if (!r) return '';
  const bandRows = Object.entries(r.byBand).map(([band, { correct, total }]) => {
    const pct = Math.round(100 * correct / total);
    return `<tr>
      <td class="pl-band">${escapeHtml(band)}</td>
      <td class="pl-band-score">${correct}/${total}</td>
      <td class="pl-band-bar">
        <div class="pl-band-bar-track"><div class="pl-band-bar-fill" style="width:${pct}%"></div></div>
      </td>
    </tr>`;
  }).join('');

  return `<div class="pl-screen pl-result pl-tier-${r.tier.toLowerCase()}">
    <div class="pl-result-icon">${r.icon}</div>
    <div class="pl-result-tier">${r.tier}</div>
    <div class="pl-result-score">${r.correct} / ${r.total} correct</div>
    <p class="pl-result-message">${r.message}</p>

    <table class="pl-band-table">
      <tbody>${bandRows}</tbody>
    </table>

    <div class="pl-btn-row">
      <button id="pl-jump"    class="pl-btn pl-btn-primary">Jump to suggested skill</button>
      <button data-share="placement" class="pl-btn">📋 Share result</button>
      <button id="pl-dismiss" class="pl-btn">Close</button>
    </div>
  </div>`;
}

// ── Controller ───────────────────────────────────────────────────────────────

export function showPlacementInvitation(state, onChange) {
  state.placement = { ...createInitialPlacementState(), phase: 'invitation' };
  onChange();
}

export function startPlacement(state, onChange) {
  state.placement = {
    ...createInitialPlacementState(),
    phase:    'playing',
    problems: buildPlacementProblems(),
    questionStartedAt: Date.now(),
  };
  onChange();
}

export function submitPlacementAnswer(state, rawInput, onChange) {
  const p = state.placement;
  if (p.phase !== 'playing') return;
  const problem = p.problems[p.idx];
  const evalRes = evaluatePlacementAnswer(rawInput, problem.expectedResult);
  const raw = Date.now() - (p.questionStartedAt ?? Date.now());
  const latencyMs = Math.min(Math.max(0, raw), LATENCY_PAUSE_CAP_MS);

  p.perAnswer = [...p.perAnswer, {
    correct: evalRes.correct, parsed: evalRes.parsed, expected: evalRes.expected, latencyMs,
  }];

  if (p.idx + 1 < p.problems.length) {
    p.idx++;
    p.questionStartedAt = Date.now();
  } else {
    p.result = classifyPlacement(p.perAnswer);
    p.phase  = 'result';
  }
  onChange();
}

export function dismissPlacement(state, onChange) {
  state.placement = serializablePlacementState(state.placement);
  onChange();
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch]));
}
