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
  renderSkillTree, renderViz, renderAppMode, renderFlashAnzan, renderDaily,
  renderAchievements, openCertificate, closeCertificate, renderChallenge,
} from './ui/render.js';
import { bindEvents } from './ui/events.js';
import {
  createInitialFlashAnzanState, serializableFlashAnzanState,
  startFlashRound, submitFlashAnswer, replayFlash, backToFlashIdle, cancelTimers,
} from './ui/flashAnzan.js';
import {
  createInitialDailyState, serializableDailyState,
  startDailyRun, submitDailyAnswer, backToDailyIdle,
} from './ui/daily.js';
import { computeStreak } from './trainer/daily.js';
import { formatDailyShare, formatFlashShare } from './trainer/shareCard.js';
import { copyText, showToast } from './ui/clipboard.js';
import {
  evaluateNewAchievements, getAchievement, createInitialAchievementsState,
} from './trainer/achievements.js';
import { parseChallengeHash, buildChallengeUrl } from './trainer/challenge.js';
import {
  createInitialChallengeState, serializableChallengeState,
  showInvitation, acceptChallenge, submitChallengeAnswer, dismissChallenge, buildChallengeBackUrl,
} from './ui/challenge.js';

let state = loadAppState() ?? createInitialAppState();

// Hydrate fields that may be missing from a saved state
state.appMode       ??= 'practice';
state.inputMode     ??= 'command';
state.inputSequence ??= [];
state.hintsVisible  ??= true;
state.focusedCol    ??= 0;
state.vizMode       ??= 'grid';
state.flashAnzan      = serializableFlashAnzanState(state.flashAnzan ?? createInitialFlashAnzanState());
state.daily           = serializableDailyState(state.daily ?? createInitialDailyState());
state.achievements    = state.achievements ?? createInitialAchievementsState();
state.achievements.unlocked ??= {};
state.challenge       = serializableChallengeState();
state.profile         = state.profile ?? { name: null };

state.progress = migrateLockedToLearning(state.progress);
state.progress = applyRustyDecay(state.progress);

// Retroactive evaluation — silently unlocks achievements that already
// qualify from prior progress (e.g. when this feature ships to existing users).
// No toasts here — only newly earned ones during gameplay should announce.
(function backfillAchievements() {
  const newly = evaluateNewAchievements(state);
  if (!newly.length) return;
  const now = Date.now();
  const next = { ...state.achievements.unlocked };
  for (const id of newly) next[id] = now;
  state.achievements = { ...state.achievements, unlocked: next };
})();

// Persist state. Flash anzan and daily runtime (timers, in-flight phase) is
// stripped — only saved stats/results survive a reload.
function persist() {
  saveAppState({
    ...state,
    flashAnzan: serializableFlashAnzanState(state.flashAnzan),
    daily:      serializableDailyState(state.daily),
    challenge:  serializableChallengeState(),
  });
}

// ── Status transitions ────────────────────────────────────────────────────────

// Re-evaluate achievement predicates, record any newly unlocked ones, and
// surface them as toasts. Returns the newly unlocked id list.
function checkAchievements() {
  const newly = evaluateNewAchievements(state);
  if (!newly.length) return newly;
  const now = Date.now();
  const next = { ...state.achievements.unlocked };
  for (const id of newly) next[id] = now;
  state.achievements = { ...state.achievements, unlocked: next };
  for (const id of newly) {
    const a = getAchievement(id);
    if (a) showToast(`${a.icon} ${a.label} unlocked`, 2400);
  }
  return newly;
}

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
  checkAchievements();
  persist();

  renderAfterSubmit(state);
  renderSkillTree(state);
  renderDashboard(state);
  renderAttemptLog(state);
  renderAchievements(state);
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
  persist();
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
  persist();
  renderSkillTree(state);
  renderExercise(state);
}

function onSupportChange(level) {
  state.supportLevel  = level;
  state.inputSequence = [];
  state.focusedCol    = 0;
  persist();
  renderExercise(state);
}

function onModeChange(mode) {
  state.inputMode     = mode;
  state.inputSequence = [];
  persist();
  renderExercise(state);
}

function onModeToggle() {
  onModeChange(state.inputMode === 'command' ? 'reflex' : 'command');
}

function onToggleHints() {
  state.hintsVisible = !state.hintsVisible;
  persist();
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

function onVizChange(mode) {
  state.vizMode = mode;
  persist();
  renderViz(state);
}

// ── App-mode (practice / flash anzan) ─────────────────────────────────────────

function onAppModeChange(mode) {
  if (mode !== 'practice' && mode !== 'flash' && mode !== 'daily') return;
  if (state.appMode === mode) return;
  if (state.appMode === 'flash') {
    cancelTimers(state);
    state.flashAnzan = { ...state.flashAnzan, phase: 'idle', timers: [] };
  }
  if (state.appMode === 'daily') {
    state.daily = { ...state.daily, phase: 'idle', problems: [], idx: 0, perAnswer: [] };
  }
  state.appMode = mode;
  persist();
  renderAppMode(state);
  renderFlashAnzan(state);
  renderDaily(state);
}

// ── Flash Anzan handlers ──────────────────────────────────────────────────────

function onFlashStart(presetKey) {
  if (state.appMode !== 'flash') return;
  startFlashRound(state, presetKey, () => renderFlashAnzan(state));
}

function onFlashSubmit() {
  const raw = document.getElementById('fa-answer')?.value ?? '';
  submitFlashAnswer(state, raw, () => {
    checkAchievements();
    renderFlashAnzan(state);
    renderAchievements(state);
    persist();
  });
}

function onFlashReplay() {
  replayFlash(state, () => renderFlashAnzan(state));
}

function onFlashBack() {
  backToFlashIdle(state, () => renderFlashAnzan(state));
  persist();
}

// ── Daily Challenge handlers ──────────────────────────────────────────────────

function onDailyStart() {
  if (state.appMode !== 'daily') return;
  startDailyRun(state, () => renderDaily(state));
}

function onDailySubmit() {
  const raw = document.getElementById('dc-answer')?.value ?? '';
  submitDailyAnswer(state, raw, () => {
    checkAchievements();
    renderDaily(state);
    renderAchievements(state);
    persist();
  });
}

function onDailyBack() {
  backToDailyIdle(state, () => renderDaily(state));
  persist();
}

// ── Certificate handlers ─────────────────────────────────────────────────────

function onCertOpen()  { openCertificate(state); }
function onCertClose() { closeCertificate(); }
function onCertPrint() { window.print(); }

// ── Friend Challenge handlers ────────────────────────────────────────────────

function ensureProfileName() {
  if (state.profile?.name?.trim()) return state.profile.name.trim();
  const raw = window.prompt('Your name (shown to your friend):', '');
  const name = (raw ?? '').trim().slice(0, 30);
  if (name) {
    state.profile = { ...state.profile, name };
    persist();
    return name;
  }
  return null;
}

function onChallengeCreate() {
  const run = state.daily.results?.[state.daily.date];
  if (!run) { showToast('Finish a daily first', 1800); return; }
  const name = ensureProfileName();
  if (!name) return;
  const base = window.location.origin + window.location.pathname;
  const url  = buildChallengeUrl(base, run, name);
  copyText(url).then(ok => showToast(ok ? 'Challenge link copied — share it' : 'Copy failed', 2200));
}

function onChallengeAccept()  { acceptChallenge(state, () => renderChallenge(state)); }
function onChallengeSubmit() {
  const raw = document.getElementById('ch-answer')?.value ?? '';
  submitChallengeAnswer(state, raw, () => renderChallenge(state));
}
function onChallengeDismiss() { dismissChallenge(state, () => renderChallenge(state)); }
function onChallengeBack() {
  const url = buildChallengeBackUrl(state);
  if (!url) return;
  const name = ensureProfileName();
  if (!name) return;
  // Rebuild with the (possibly newly entered) name.
  const base = window.location.origin + window.location.pathname;
  const finalUrl = buildChallengeUrl(base, state.challenge.myRun, name);
  copyText(finalUrl).then(ok => showToast(ok ? 'Challenge-back link copied' : 'Copy failed', 2200));
}

// ── Share-card handler (Daily + Flash) ────────────────────────────────────────

function onShare(kind) {
  let text = '';
  if (kind === 'daily') {
    const run = state.daily.results[state.daily.date];
    if (!run) return;
    const { current } = computeStreak(state.daily.results, run.date);
    text = formatDailyShare(run, current);
  } else if (kind === 'flash') {
    const fa = state.flashAnzan;
    if (!fa?.lastResult || !fa?.config) return;
    const stats = fa.stats?.[fa.presetKey] ?? { played: 0, correct: 0, bestStreak: 0 };
    text = formatFlashShare(fa.config.label, fa.config, fa.lastResult, stats);
  }
  if (!text) return;
  copyText(text).then(ok => showToast(ok ? 'Copied to clipboard' : 'Copy failed'));
}

// ── Boot ──────────────────────────────────────────────────────────────────────

bindEvents(
  {
    onSubmit, onNext, onReset, onSkillChange, onSupportChange,
    onModeChange, onModeToggle, onToggleHints,
    onAddToken, onUndo, onClearSequence, onAddCommandInput,
    onColLeft, onColRight, onVizChange,
    onAppModeChange,
    onFlashStart, onFlashSubmit, onFlashReplay, onFlashBack,
    onDailyStart, onDailySubmit, onDailyBack,
    onShare,
    onCertOpen, onCertClose, onCertPrint,
    onChallengeCreate, onChallengeAccept, onChallengeSubmit,
    onChallengeDismiss, onChallengeBack,
  },
  () => state,
);

renderApp(state);

// ── Friend-challenge hash parsing ─────────────────────────────────────────────
// If this page was opened with a #challenge?… hash, surface the invitation
// modal over whatever tab the recipient happens to be on.
(function maybeShowChallengeInvite() {
  const parsed = parseChallengeHash(window.location.hash);
  if (!parsed) return;
  showInvitation(state, parsed, () => renderChallenge(state));
})();
