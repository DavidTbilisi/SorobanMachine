/**
 * Tiny WebAudio synth — no embedded audio files keeps the bundle tiny and
 * the runtime dependency-free.
 *
 * AudioContext is created lazily on first play call so we don't run afoul
 * of browser autoplay policies (creating it before any user gesture works,
 * but the context starts suspended — we resume() inside each play).
 */

let ctx = null;
let enabled = true;

function ensureCtx() {
  if (ctx) return ctx;
  const AC = typeof AudioContext !== 'undefined' ? AudioContext : window.webkitAudioContext;
  if (!AC) return null;
  try { ctx = new AC(); } catch { return null; }
  return ctx;
}

function gate() {
  if (!enabled) return null;
  const c = ensureCtx();
  if (!c) return null;
  if (c.state === 'suspended') { c.resume().catch(() => {}); }
  return c;
}

/** Single-osc tone with exponential decay. Internal helper. */
function tone(freq, durMs, { type = 'sine', gain = 0.12, attack = 0.005 } = {}) {
  const c = gate();
  if (!c) return;
  const t0 = c.currentTime;
  const osc = c.createOscillator();
  const g   = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + durMs / 1000);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + durMs / 1000 + 0.02);
}

// ── Public play functions ────────────────────────────────────────────────────

export function setSoundEnabled(on) { enabled = !!on; }
export function isSoundEnabled()    { return enabled; }

/** Short pluck for a bead/key press. */
export function playClick() {
  tone(880, 50, { type: 'triangle', gain: 0.05 });
}

/** Higher blip for a Flash Anzan number flash. */
export function playTick() {
  tone(660, 60, { type: 'sine', gain: 0.07 });
}

/** Brief major-triad arpeggio on a correct answer. */
export function playSuccess() {
  if (!gate()) return;
  tone(523, 120, { type: 'sine', gain: 0.10 });
  setTimeout(() => tone(659, 120, { type: 'sine', gain: 0.10 }), 60);
  setTimeout(() => tone(784, 220, { type: 'sine', gain: 0.10 }), 120);
}

/** Low-pitched buzz on a wrong answer. */
export function playFail() {
  tone(180, 220, { type: 'sawtooth', gain: 0.07 });
}

/** Rising sweep when advancing to next exercise/problem. */
export function playWhoosh() {
  const c = gate();
  if (!c) return;
  const t0 = c.currentTime;
  const osc = c.createOscillator();
  const g   = c.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(280, t0);
  osc.frequency.exponentialRampToValueAtTime(720, t0 + 0.16);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.06, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.20);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + 0.22);
}

/** Punchy 3-note flourish for major unlocks. */
export function playFanfare() {
  if (!gate()) return;
  tone(523, 150, { type: 'triangle', gain: 0.10 });
  setTimeout(() => tone(659, 150, { type: 'triangle', gain: 0.10 }), 80);
  setTimeout(() => tone(784, 150, { type: 'triangle', gain: 0.10 }), 160);
  setTimeout(() => tone(1046, 320, { type: 'triangle', gain: 0.12 }), 240);
}
