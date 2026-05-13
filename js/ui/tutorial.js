/**
 * "What is a soroban?" — an interactive 5-step intro for newcomers.
 *
 * Each step is hand-written content + inline SVG. Pure DOM-emitting helpers.
 */

const STEPS = [
  {
    title: 'Meet the soroban',
    body: `<p>The soroban is a Japanese abacus. Each <strong>rod</strong> is one decimal column — ones on the right, tens to its left, and so on. A horizontal <strong>beam</strong> splits each rod into one bead above (worth <strong>5</strong>) and four beads below (worth <strong>1</strong> each).</p>
           <p>A bead is "active" only when it touches the beam.</p>`,
    svg: sorobanSVG({ upper: 0, lower: 0, highlightBeam: true, label: 'Empty rod = 0' }),
  },
  {
    title: 'Counting 1 → 4',
    body: `<p>To add 1, push a lower bead <em>up</em> to the beam. Push three more, you have 4. The lower beads stack against the beam from the bottom up.</p>`,
    svg: sorobanSVG({ upper: 0, lower: 4, label: 'Four 1-beads up = 4', highlightLower: true }),
  },
  {
    title: 'The 5-bead',
    body: `<p>Now you need to add 1 more, but you're out of lower beads. Push the upper bead <em>down</em> to the beam (that's worth 5) and clear all four lower beads. Net result: 4 + 1 = 5.</p>
           <p>This swap is called a <strong>5-complement</strong>.</p>`,
    svg: sorobanSVG({ upper: 1, lower: 0, label: 'Upper down, lower cleared = 5', highlightUpper: true }),
  },
  {
    title: 'Reading any digit',
    body: `<p>Any digit 0–9 is just <code>upper × 5 + lower × 1</code>. The number 7 looks like this — upper down (5), two lower beads up (2).</p>`,
    svg: sorobanSVG({ upper: 1, lower: 2, label: '5 + 2 = 7' }),
  },
  {
    title: "You're ready",
    body: `<p>Direct Add lets you practice without complements first — small steps that build muscle memory. Then 5-complement, 10-complement, two-digit, and finally mental.</p>
           <p>Tap <strong>Start</strong> to load your first exercise. Take the <strong>Placement Test</strong> from the header if you'd rather skip ahead.</p>`,
    svg: sorobanSVG({ upper: 1, lower: 2, label: 'Ready', highlightAll: true }),
  },
];

export function createInitialTutorialState() {
  return { phase: 'idle', step: 0 };   // idle | playing
}

export function serializableTutorialState(t) {
  return { phase: 'idle', step: 0, seen: t?.seen ?? false };
}

// ── Views ────────────────────────────────────────────────────────────────────

export function tutorialHTML(tutorial) {
  if (tutorial.phase !== 'playing') return '';
  const step = STEPS[tutorial.step] ?? STEPS[0];
  const idx  = tutorial.step;
  const last = idx === STEPS.length - 1;
  const dots = STEPS.map((_, i) =>
    `<span class="tu-dot${i === idx ? ' tu-dot-active' : i < idx ? ' tu-dot-done' : ''}"></span>`
  ).join('');

  return `<div class="tu-screen">
    <div class="tu-eyebrow">Soroban Machine · Tutorial</div>
    <h2 class="tu-title">${step.title}</h2>
    <div class="tu-illustration">${step.svg}</div>
    <div class="tu-body">${step.body}</div>
    <div class="tu-dots">${dots}</div>
    <div class="tu-btn-row">
      ${idx > 0 ? '<button id="tu-prev"     class="tu-btn">← Back</button>' : ''}
      <button id="tu-dismiss" class="tu-btn tu-btn-ghost">Skip</button>
      ${last
        ? '<button id="tu-finish" class="tu-btn tu-btn-primary">Start practicing</button>'
        : '<button id="tu-next"   class="tu-btn tu-btn-primary">Next →</button>'}
    </div>
  </div>`;
}

// ── Controller ───────────────────────────────────────────────────────────────

export function openTutorial(state, onChange) {
  state.tutorial = { phase: 'playing', step: 0, seen: true };
  onChange();
}

export function nextTutorialStep(state, onChange) {
  const t = state.tutorial;
  if (t.phase !== 'playing') return;
  if (t.step < STEPS.length - 1) {
    state.tutorial = { ...t, step: t.step + 1 };
    onChange();
  }
}

export function prevTutorialStep(state, onChange) {
  const t = state.tutorial;
  if (t.phase !== 'playing' || t.step <= 0) return;
  state.tutorial = { ...t, step: t.step - 1 };
  onChange();
}

export function dismissTutorial(state, onChange) {
  state.tutorial = { phase: 'idle', step: 0, seen: true };
  onChange();
}

// ── Inline illustration (self-contained — does not depend on views.js) ─────

function sorobanSVG({ upper, lower, label, highlightBeam, highlightUpper, highlightLower, highlightAll }) {
  const beamY = 84;
  const upperOn  = upper ? 1 : 0;
  const lowerCount = Math.max(0, Math.min(4, lower | 0));
  const beadW = 36, beadH = 12, rodX = 80, frameW = 130, frameLeft = rodX - frameW / 2;
  const upperY = upperOn ? beamY - beadH - 1 : 20;
  const lowerYs = [];
  for (let i = 0; i < 4; i++) {
    const active = i < lowerCount;
    const yActive = beamY + 2 + i * (beadH + 1);
    const yIdle   = 160 - (3 - i) * (beadH + 1);
    lowerYs.push(active ? yActive : yIdle);
  }
  const isHighlightAll = !!highlightAll;

  const beadEl = (cx, cy, w, h, active, highlight) => `
    <ellipse cx="${cx}" cy="${cy + h / 2}" rx="${w / 2}" ry="${h / 2}"
             fill="${active ? '#4e7848' : '#daeeda'}"
             stroke="#2c2a26" stroke-width="1.2"
             ${highlight || isHighlightAll ? 'class="tu-bead-glow"' : ''}/>
  `;

  return `<svg class="tu-soroban" viewBox="0 0 160 200" role="img" aria-label="${label || ''}">
    <!-- Frame -->
    <rect x="${frameLeft}" y="6" width="${frameW}" height="190" rx="6"
          fill="#f4ebd6" stroke="#786858" stroke-width="2"/>
    <!-- Beam -->
    <rect x="${frameLeft}" y="${beamY - 2}" width="${frameW}" height="6"
          fill="#786858"
          ${highlightBeam ? 'class="tu-beam-glow"' : ''}/>
    <!-- Rod -->
    <line x1="${rodX}" y1="6" x2="${rodX}" y2="196" stroke="#786858" stroke-width="2"/>
    <!-- Upper bead (×5) -->
    ${beadEl(rodX, upperY, beadW, beadH, upperOn === 1, highlightUpper)}
    <!-- Four 1-beads -->
    ${lowerYs.map((y, i) => beadEl(rodX, y, beadW, beadH, i < lowerCount, highlightLower)).join('')}
    ${label ? `<text x="${rodX}" y="195" text-anchor="middle" font-family="Outfit, sans-serif"
                font-size="9" fill="#786858" class="tu-label">${escapeXml(label)}</text>` : ''}
  </svg>`;
}

function escapeXml(s) {
  return String(s ?? '').replace(/[<>&"']/g, ch => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;',
  }[ch]));
}
