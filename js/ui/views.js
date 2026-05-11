import { STATUS, SUPPORT_LABELS, LICENSE } from '../config.js';
import { getAllSkills, getRecommendationHint } from '../trainer/skills.js';
import { getMasteryBlockers } from '../trainer/gates.js';
import { isMentalOnlySkill } from '../trainer/exercises.js';
import { operationTokenToLabel, sequenceToLabels } from '../keyboard/shortcuts.js';

// ── Skill selector ────────────────────────────────────────────────────────────

export function skillSelectorHTML(progress, selectedSkillId) {
  return `<fieldset>
    <legend>Skill</legend>
    ${getAllSkills().map(skill => {
      const p = progress[skill.id];
      const unavailable = !skill.implemented;
      const recommendation = skill.implemented ? getRecommendationHint(skill.id, progress) : null;
      const reason = !skill.implemented ? 'coming soon' : (recommendation ?? '');
      const badge = p.status === STATUS.MASTERED ? ' ✓' : p.status === STATUS.PROVISIONAL ? ' ◑' : '';
      const labelClass = unavailable ? 'skill-unavailable' : recommendation ? 'skill-recommended' : '';
      return `<label class="skill-label ${labelClass}">
        <input type="radio" name="skill" value="${skill.id}"
          ${skill.id === selectedSkillId ? 'checked' : ''}
          ${unavailable ? 'disabled' : ''}>
        ${skill.label}${badge}
        <span class="skill-meta">[${p.status}${reason ? ' — ' + reason : ''}]</span>
      </label>`;
    }).join('\n')}
  </fieldset>`;
}

// ── Support selector ──────────────────────────────────────────────────────────

export function supportSelectorHTML(supportLevel) {
  return `<fieldset>
    <legend>Support Level</legend>
    <select id="support-level">
      ${Object.entries(SUPPORT_LABELS).map(([val, label]) =>
        `<option value="${val}"${Number(val) === supportLevel ? ' selected' : ''}>${val} — ${label}</option>`
      ).join('\n')}
    </select>
  </fieldset>`;
}

// ── Mode selector ─────────────────────────────────────────────────────────────

export function modeSelectorHTML(inputMode) {
  return `<fieldset>
    <legend>Input Mode <span class="key-hint">[Tab]</span></legend>
    <label><input type="radio" name="input-mode" value="command" ${inputMode === 'command' ? 'checked' : ''}> Command</label>
    &nbsp;
    <label><input type="radio" name="input-mode" value="reflex" ${inputMode === 'reflex' ? 'checked' : ''}> Reflex</label>
  </fieldset>`;
}

// ── Exercise panel ────────────────────────────────────────────────────────────

export function exercisePanelHTML(state) {
  const { currentExercise: ex, selectedSkillId, supportLevel, inputMode, inputSequence, lastAttempt } = state;
  if (!ex) {
    return `<div><em>No exercise loaded.</em> <button id="btn-next">Start Exercise</button></div>`;
  }
  const answered = !!lastAttempt;
  const isMental = isMentalOnlySkill(ex.skillId) || supportLevel === 3;
  const isReflex = inputMode === 'reflex' && !isMental;

  const seqLabels = sequenceToLabels(inputSequence);
  const seqDisplay = seqLabels.length
    ? seqLabels.map(l => `<span class="token-chip">${l}</span>`).join(' ')
    : '<span class="seq-empty">—</span>';

  const inputSection = isMental
    ? `<input type="text" id="answer-input" placeholder="Final answer" ${answered ? 'disabled' : ''} autofocus>`
    : isReflex
      ? `<div class="sequence-input reflex-sequence" id="sequence-live">${seqDisplay}</div>`
      : `<div class="sequence-built">
           <span class="seq-label">Sequence:</span> ${seqDisplay}
         </div>
         <input type="text" id="answer-input" placeholder="+5  or  +5, −2"
           ${answered ? 'disabled' : ''} autofocus>`;

  return `<div>
    <p class="exercise-meta">
      <strong>${selectedSkillId}</strong> · ${SUPPORT_LABELS[supportLevel]} · <em>${inputMode} mode</em>
    </p>
    <p class="prompt">${ex.prompt}</p>
    ${inputSection}
    <div class="btn-row">
      <button id="btn-submit"${answered ? ' disabled' : ''}>Submit [Enter]</button>
      <button id="btn-next">Next [Space]</button>
      ${isReflex && !answered ? '<button id="btn-undo">Undo [⌫]</button>' : ''}
    </div>
  </div>`;
}

// ── Soroban SVG visualization ─────────────────────────────────────────────────

function sorobanSVG(value) {
  const upper = value >= 5 ? 1 : 0;
  const lower = value % 5;

  // Layout constants
  const W = 68, H = 200, cx = 34;
  const FH = 10;                      // frame bar height
  const BCY = 100, BH = 14;          // beam center-Y, beam height
  const BW = 52, BHALF = 26;         // bead width, half-width
  const BHH = 9;                      // bead half-height
  const STEP = 21;                    // bead center-to-center step

  // Upper bead Y
  const upperCY = upper === 1
    ? BCY - BH / 2 - BHH - 3          // active: snug above beam
    : FH + BHH + 4;                   // inactive: near top frame

  // Lower beads Y
  const lowerTop = BCY + BH / 2;
  const lowerBot = H - FH;
  const lowerBeads = [];
  for (let i = 0; i < lower; i++)
    lowerBeads.push({ cy: lowerTop + BHH + 2 + i * STEP, active: true });
  for (let j = (4 - lower) - 1; j >= 0; j--)
    lowerBeads.push({ cy: lowerBot - BHH - 2 - j * STEP, active: false });

  // Bicone path: curved diamond (the classic soroban bead silhouette)
  const bicone = (bx, by) => {
    const c = 0.26; // curvature factor — 0 = sharp diamond, 1 = ellipse
    return `M${bx} ${by - BHH}` +
      ` Q${bx + BHALF} ${by - BHH * c} ${bx + BHALF} ${by}` +
      ` Q${bx + BHALF} ${by + BHH * c} ${bx} ${by + BHH}` +
      ` Q${bx - BHALF} ${by + BHH * c} ${bx - BHALF} ${by}` +
      ` Q${bx - BHALF} ${by - BHH * c} ${bx} ${by - BHH}Z`;
  };

  // Render one bead: shadow-filtered shape + specular highlight dot outside filter
  const bead = (by, active, isUpper) => {
    const grad   = active ? (isUpper ? 'sbu' : 'sbl') : 'sbi';
    const stroke = active ? (isUpper ? '#8a5252' : '#507852') : '#c8c4bc';
    const hlX = cx - BHALF * 0.26, hlY = by - BHH * 0.38;
    const hl = active
      ? `<ellipse cx="${hlX}" cy="${hlY}" rx="${BHALF * 0.19}" ry="${BHH * 0.24}" fill="rgba(255,255,255,.6)"/>`
      : '';
    return `<path d="${bicone(cx, by)}" fill="url(#${grad})" stroke="${stroke}" stroke-width="0.75" filter="url(#sbsh)"/>${hl}`;
  };

  const LY = H + 11; // label Y
  return `<svg width="${W}" height="${LY + 2}" viewBox="0 0 ${W} ${LY + 2}" class="soroban-svg">
  <defs>
    <filter id="sbsh" x="-22%" y="-30%" width="144%" height="160%">
      <feDropShadow dx="0" dy="1.8" stdDeviation="1.4" flood-color="rgba(0,0,0,.22)"/>
    </filter>
    <!-- Milk red lacquer — upper bead -->
    <radialGradient id="sbu" cx="38%" cy="30%" r="70%">
      <stop offset="0%"   stop-color="#fdf2f2"/>
      <stop offset="20%"  stop-color="#f0c8c8"/>
      <stop offset="50%"  stop-color="#d89898"/>
      <stop offset="78%"  stop-color="#c07878"/>
      <stop offset="100%" stop-color="#9a5858"/>
    </radialGradient>
    <!-- Milk green lacquer — lower beads -->
    <radialGradient id="sbl" cx="38%" cy="30%" r="70%">
      <stop offset="0%"   stop-color="#f0f8ee"/>
      <stop offset="20%"  stop-color="#c8e0c0"/>
      <stop offset="50%"  stop-color="#98c890"/>
      <stop offset="78%"  stop-color="#78a870"/>
      <stop offset="100%" stop-color="#527852"/>
    </radialGradient>
    <!-- Neutral linen — inactive -->
    <radialGradient id="sbi" cx="38%" cy="30%" r="70%">
      <stop offset="0%"   stop-color="#fdfcfa"/>
      <stop offset="25%"  stop-color="#f0ece6"/>
      <stop offset="55%"  stop-color="#dedad2"/>
      <stop offset="80%"  stop-color="#cec8c0"/>
      <stop offset="100%" stop-color="#b8b4ac"/>
    </radialGradient>
    <!-- Polished rod — 5-stop cylindrical highlight -->
    <linearGradient id="sbrod" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%"   stop-color="#626060"/>
      <stop offset="22%"  stop-color="#a8a4a0"/>
      <stop offset="50%"  stop-color="#e4e0dc"/>
      <stop offset="78%"  stop-color="#a8a4a0"/>
      <stop offset="100%" stop-color="#626060"/>
    </linearGradient>
    <!-- Warm wood frame -->
    <linearGradient id="sbfr" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="#cca878"/>
      <stop offset="40%"  stop-color="#a08050"/>
      <stop offset="100%" stop-color="#785828"/>
    </linearGradient>
    <!-- Darker beam wood -->
    <linearGradient id="sbbm" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="#b89070"/>
      <stop offset="35%"  stop-color="#906840"/>
      <stop offset="100%" stop-color="#5c3a18"/>
    </linearGradient>
  </defs>

  <!-- Top frame bar -->
  <rect x="1" y="1" width="${W - 2}" height="${FH}" rx="3" fill="url(#sbfr)" stroke="rgba(0,0,0,.13)" stroke-width=".5"/>
  <rect x="5" y="3" width="${W - 10}" height="3" rx="1.5" fill="rgba(255,255,255,.22)"/>

  <!-- Rod (cylindrical) -->
  <rect x="${cx - 2}" y="${FH}" width="4" height="${H - FH * 2}" fill="url(#sbrod)" rx="2"/>

  <!-- Beam -->
  <rect x="1" y="${BCY - BH / 2}" width="${W - 2}" height="${BH}" rx="4" fill="url(#sbbm)" stroke="rgba(0,0,0,.15)" stroke-width=".5"/>
  <rect x="5" y="${BCY - BH / 2 + 2}" width="${W - 10}" height="3" rx="1.5" fill="rgba(255,255,255,.15)"/>

  <!-- Bottom frame bar -->
  <rect x="1" y="${H - FH}" width="${W - 2}" height="${FH}" rx="3" fill="url(#sbfr)" stroke="rgba(0,0,0,.13)" stroke-width=".5"/>

  ${bead(upperCY, upper === 1, true)}
  ${lowerBeads.map(b => bead(b.cy, b.active, false)).join('\n  ')}

  <text x="${cx}" y="${LY}" text-anchor="middle" font-size="11" fill="#78746e" font-family="monospace" font-weight="700">${value}</text>
</svg>`;
}

export function sorobanStateHTML(exercise, lastAttempt, supportLevel, focusedCol = 0) {
  if (!exercise || supportLevel === 3 || isMentalOnlySkill(exercise.skillId)) return '';
  const showAfter = !!lastAttempt;
  const numCols   = exercise.numCols ?? 1;

  if (numCols === 1) {
    const before   = exercise.startValue;
    const afterRaw = exercise.expectedResult;
    const afterDigit = ((afterRaw % 10) + 10) % 10;
    const carryNeeded  = afterRaw >= 10;
    const borrowNeeded = afterRaw < 0;
    let afterLabel = 'After';
    if (carryNeeded)  afterLabel += ' + carry';
    if (borrowNeeded) afterLabel += ' + borrow';

    return `<div id="soroban-state">
      <div class="soroban-cols">
        <div class="soroban-col">
          <div class="soroban-col-label">Before</div>
          ${sorobanSVG(before)}
        </div>
        ${showAfter
          ? `<div class="soroban-col">
               <div class="soroban-col-label">${afterLabel}</div>
               ${sorobanSVG(afterDigit)}
             </div>`
          : `<div class="soroban-col soroban-placeholder">
               <div class="soroban-col-label">After</div>
               <div class="soroban-placeholder-box">?</div>
             </div>`}
      </div>
    </div>`;
  }

  // ── Multi-column (2 rods) ──────────────────────────────────────────────────
  const COL_NAMES = ['Ones', 'Tens', 'Hundreds'];

  function extractDigit(value, col) {
    return Math.floor(Math.abs(value) / Math.pow(10, col)) % 10;
  }

  // Display order: highest-order rod on left (e.g. col 1 then col 0)
  const displayOrder = Array.from({ length: numCols }, (_, i) => numCols - 1 - i);

  function rodGroup(value, showFocus) {
    return displayOrder.map(col => {
      const focused = showFocus && col === focusedCol;
      return `<div class="soroban-col${focused ? ' soroban-focused' : ''}">
        <div class="soroban-col-label">${COL_NAMES[col] ?? `Col ${col}`}${focused ? ' ◀' : ''}</div>
        ${sorobanSVG(extractDigit(value, col))}
      </div>`;
    }).join('\n');
  }

  const label = exercise.direction === 'add' ? 'After + carry' : 'After + borrow';

  return `<div id="soroban-state" class="multi-col">
    <div class="soroban-group">
      <div class="soroban-group-label">Before</div>
      <div class="soroban-cols">${rodGroup(exercise.startValue, !showAfter)}</div>
    </div>
    <div class="soroban-group">
      <div class="soroban-group-label">${showAfter ? label : 'After'}</div>
      <div class="soroban-cols">
        ${showAfter
          ? rodGroup(exercise.expectedResult, false)
          : displayOrder.map(() => `<div class="soroban-col soroban-placeholder">
              <div class="soroban-col-label">?</div>
              <div class="soroban-placeholder-box">?</div>
            </div>`).join('\n')}
      </div>
    </div>
  </div>`;
}

// ── Visualization panel (tab switcher + 6 renderers) ─────────────────────────

const VIZ_MODES = [
  { id: 'grid',       label: 'Grid' },
  { id: 'numberline', label: 'Line' },
  { id: 'base10',     label: 'Base 10' },
  { id: 'tokens',     label: 'Tokens' },
  { id: 'barmodel',   label: 'Bars' },
  { id: 'fingers',    label: 'Fingers' },
];

export function vizHTML(exercise, supportLevel, lastAttempt, vizMode = 'grid') {
  if (!exercise || supportLevel === 3 || isMentalOnlySkill(exercise.skillId)) return '';
  if (exercise.ops) return '';
  const { startValue, amount, direction } = exercise;
  if (typeof startValue !== 'number' || typeof amount !== 'number') return '';

  const tabs = VIZ_MODES.map(m =>
    `<button class="viz-tab${vizMode === m.id ? ' active' : ''}" data-viz="${m.id}">${m.label}</button>`
  ).join('');

  let inner;
  if      (vizMode === 'numberline') inner = renderNumberLine(startValue, amount, direction, lastAttempt);
  else if (vizMode === 'base10')     inner = renderBase10(startValue, amount, direction, lastAttempt);
  else if (vizMode === 'tokens')     inner = renderTokens(startValue, amount, direction, lastAttempt);
  else if (vizMode === 'barmodel')   inner = renderBarModel(startValue, amount, direction, lastAttempt);
  else if (vizMode === 'fingers')    inner = renderFingers(startValue, amount, direction, lastAttempt);
  else                               inner = renderGrid(startValue, amount, direction);

  return `<div class="viz-panel">
    <div class="viz-tabs">${tabs}</div>
    <div class="viz-content">${inner}</div>
  </div>`;
}

function renderGrid(startValue, amount, direction) {
  const CELL = 14, GAP = 2, COLS = 10, ROWS = 10, PAD = 2;
  const W = COLS * (CELL + GAP) - GAP + PAD * 2;
  const H = ROWS * (CELL + GAP) - GAP + PAD * 2;
  const aCount = Math.max(0, Math.min(100, startValue));
  const bStart = aCount;
  const bCount = Math.max(0, Math.min(amount, 100 - bStart));
  const cells = [];
  for (let i = 0; i < COLS * ROWS; i++) {
    const r = Math.floor(i / COLS), c = i % COLS;
    const cx = c * (CELL + GAP) + CELL / 2 + PAD;
    const cy = r * (CELL + GAP) + CELL / 2 + PAD;
    const radius = CELL / 2 - 2;
    const fill   = i < aCount ? '#d8a0a0' : (i >= bStart && i < bStart + bCount ? '#a0c898' : 'none');
    const stroke = i < aCount ? '#8a5050' : (i >= bStart && i < bStart + bCount ? '#507850' : '#d4d0c8');
    cells.push(`<circle cx="${cx}" cy="${cy}" r="${radius}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`);
  }
  const divX = 5 * (CELL + GAP) - GAP / 2 + PAD;
  cells.push(`<line x1="${divX}" y1="${PAD}" x2="${divX}" y2="${H - PAD}" stroke="#718096" stroke-width="1.5"/>`);
  const sign = direction === 'add' ? '+' : '−';
  return `<div class="number-grid">
    <div class="grid-label">${startValue} ${sign} ${amount}</div>
    <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${cells.join('')}</svg>
    <div class="grid-legend">
      <span class="grid-key"><span class="grid-dot grid-dot-a"></span> A = ${startValue}</span>
      <span class="grid-key"><span class="grid-dot grid-dot-b"></span> B = ${amount}</span>
    </div>
  </div>`;
}

function renderNumberLine(startValue, amount, direction, lastAttempt) {
  const result = direction === 'add' ? startValue + amount : startValue - amount;
  const answered = !!lastAttempt;
  const lo = Math.max(0, Math.min(startValue, result) - 1);
  const hi = Math.max(startValue, result) + 2;
  const range = Math.max(hi - lo, 8);
  const W = 270, H = 72, LP = 22, RP = 14, BY = 48;
  const chartW = W - LP - RP;
  const toX = v => LP + (v - lo) / range * chartW;
  const aX = toX(startValue), rX = toX(result);
  const arcH = Math.max(16, Math.abs(rX - aX) * 0.5);
  const sign = direction === 'add' ? '+' : '−';
  const ticks = [];
  for (let v = lo; v <= lo + range; v++) {
    const x = toX(v).toFixed(1);
    const big = v % 5 === 0;
    ticks.push(`<line x1="${x}" y1="${BY}" x2="${x}" y2="${BY + (big ? 9 : 4)}" stroke="#b8b4aa" stroke-width="${big ? 1.5 : 0.8}"/>`);
    if (big) ticks.push(`<text x="${x}" y="${BY + 20}" text-anchor="middle" font-size="9" fill="#78746e">${v}</text>`);
  }
  return `<div class="viz-numline">
    <div class="grid-label">${startValue} ${sign} ${amount}</div>
    <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
      <defs>
        <marker id="nlarrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
          <polygon points="0,0 7,3.5 0,7" fill="#a0c898"/>
        </marker>
      </defs>
      <line x1="${LP}" y1="${BY}" x2="${W - RP}" y2="${BY}" stroke="#b8b4aa" stroke-width="1.5"/>
      ${ticks.join('')}
      ${answered ? `<path d="M${aX.toFixed(1)} ${BY - 5} Q${((aX + rX) / 2).toFixed(1)} ${(BY - arcH - 5).toFixed(1)} ${rX.toFixed(1)} ${BY - 5}" fill="none" stroke="#a0c898" stroke-width="2" marker-end="url(#nlarrow)"/>` : ''}
      <circle cx="${aX.toFixed(1)}" cy="${BY}" r="6.5" fill="#d8a0a0" stroke="#8a5050" stroke-width="1.5"/>
      <text x="${aX.toFixed(1)}" y="${BY - 11}" text-anchor="middle" font-size="10" font-weight="700" fill="#8a5050">${startValue}</text>
      ${answered ? `<circle cx="${rX.toFixed(1)}" cy="${BY}" r="6.5" fill="#a0c898" stroke="#507850" stroke-width="1.5"/>
        <text x="${rX.toFixed(1)}" y="${BY - 11}" text-anchor="middle" font-size="10" font-weight="700" fill="#507850">${result}</text>` : ''}
    </svg>
  </div>`;
}

function renderBase10(startValue, amount, direction, lastAttempt) {
  const answered = !!lastAttempt;
  const result = direction === 'add' ? startValue + amount : startValue - amount;
  const sign = direction === 'add' ? '+' : '−';
  function blocksSVG(value, fill, stroke) {
    const abs = Math.abs(value);
    const tens = Math.floor(abs / 10), units = abs % 10;
    const U = 12, G = 2, COLS = 5;
    const rodW = 10 * (U + G) - G;
    const shapes = [];
    let y = 2;
    for (let t = 0; t < tens; t++) {
      shapes.push(`<rect x="2" y="${y}" width="${rodW}" height="${U}" rx="3" fill="${fill}" stroke="${stroke}" stroke-width="1" opacity="0.9"/>`);
      for (let d = 1; d < 10; d++) shapes.push(`<line x1="${2 + d * (U + G) - 1}" y1="${y}" x2="${2 + d * (U + G) - 1}" y2="${y + U}" stroke="${stroke}" stroke-width="0.5" opacity="0.4"/>`);
      y += U + G + 2;
    }
    for (let u = 0; u < units; u++) {
      shapes.push(`<rect x="${2 + (u % COLS) * (U + G)}" y="${y + Math.floor(u / COLS) * (U + G)}" width="${U}" height="${U}" rx="2" fill="${fill}" stroke="${stroke}" stroke-width="1" opacity="0.9"/>`);
    }
    const unitRows = Math.ceil(units / COLS);
    const svgH = Math.max(y + (units > 0 ? unitRows * (U + G) + 2 : 2), 18);
    const svgW = Math.max(rodW, COLS * (U + G)) + 4;
    return `<svg width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}" style="overflow:visible">${shapes.join('')}</svg>`;
  }
  const rFill = result >= 0 ? '#b8d4e8' : '#f0c8c8';
  const rStroke = result >= 0 ? '#406880' : '#8a5050';
  return `<div class="viz-base10">
    <div class="grid-label">${startValue} ${sign} ${amount}</div>
    <div class="b10-row">
      <div class="b10-group">${blocksSVG(startValue, '#f0c8c8', '#8a5050')}<div class="b10-label b10-label-a">A = ${startValue}</div></div>
      <div class="b10-op">${sign}</div>
      <div class="b10-group">${blocksSVG(amount, '#c8e4c0', '#507850')}<div class="b10-label b10-label-b">B = ${amount}</div></div>
      ${answered ? `<div class="b10-op">=</div><div class="b10-group">${blocksSVG(result, rFill, rStroke)}<div class="b10-label">${result}</div></div>` : ''}
    </div>
  </div>`;
}

function renderTokens(startValue, amount, direction, lastAttempt) {
  const answered = !!lastAttempt;
  const result = direction === 'add' ? startValue + amount : startValue - amount;
  const sign = direction === 'add' ? '+' : '−';
  function coinsSVG(count, fill, stroke) {
    const n = Math.max(0, Math.min(count, 30));
    const R = 8, G = 3, COLS = 5, cellW = R * 2 + G;
    const cols = Math.min(n || 1, COLS);
    const rows = Math.max(Math.ceil(n / COLS), 1);
    const svgW = cols * cellW + 2, svgH = rows * cellW + 2;
    const shapes = [];
    for (let i = 0; i < n; i++) {
      const cx = (i % COLS) * cellW + R + 1, cy = Math.floor(i / COLS) * cellW + R + 1;
      shapes.push(`<circle cx="${cx}" cy="${cy}" r="${R}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`);
      shapes.push(`<ellipse cx="${cx - R * 0.25}" cy="${cy - R * 0.3}" rx="${(R * 0.35).toFixed(1)}" ry="${(R * 0.22).toFixed(1)}" fill="rgba(255,255,255,0.45)"/>`);
    }
    if (n === 0) shapes.push(`<text x="4" y="14" font-size="11" fill="#b8b4aa">0</text>`);
    return `<svg width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}">${shapes.join('')}</svg>`;
  }
  const rFill = result >= 0 ? '#b8d4e8' : '#f0c8c8';
  const rStroke = result >= 0 ? '#406880' : '#8a5050';
  return `<div class="viz-tokens">
    <div class="grid-label">${startValue} ${sign} ${amount}</div>
    <div class="b10-row">
      <div class="b10-group">${coinsSVG(startValue, '#f0c8c8', '#8a5050')}<div class="b10-label b10-label-a">A = ${startValue}</div></div>
      <div class="b10-op">${sign}</div>
      <div class="b10-group">${coinsSVG(amount, '#c8e4c0', '#507850')}<div class="b10-label b10-label-b">B = ${amount}</div></div>
      ${answered ? `<div class="b10-op">=</div><div class="b10-group">${coinsSVG(Math.abs(result), rFill, rStroke)}<div class="b10-label">${result}</div></div>` : ''}
    </div>
  </div>`;
}

function renderBarModel(startValue, amount, direction, lastAttempt) {
  const answered = !!lastAttempt;
  const result = direction === 'add' ? startValue + amount : startValue - amount;
  const sign = direction === 'add' ? '+' : '−';
  const maxVal = Math.max(startValue, amount, Math.abs(result), 1);
  const W = 240, BH = 26, GAP = 8, LP = 28;
  const chartW = W - LP - 8;
  const toW = v => Math.max(4, v / maxVal * chartW);
  const aW = toW(startValue), bW = toW(amount), rW = toW(Math.abs(result));
  const rows = answered ? 3 : 2;
  const svgH = 4 + rows * (BH + GAP);
  const rFill = result >= 0 ? '#b8d4e8' : '#f0c8c8';
  const rStroke = result >= 0 ? '#406880' : '#8a5050';
  return `<div class="viz-barmodel">
    <div class="grid-label">${startValue} ${sign} ${amount}</div>
    <svg width="${W}" height="${svgH}" viewBox="0 0 ${W} ${svgH}">
      <text x="${LP - 4}" y="${BH / 2 + 8}" text-anchor="end" font-size="10" font-weight="700" fill="#8a5050">A</text>
      <rect x="${LP}" y="4" width="${aW}" height="${BH}" rx="4" fill="#f0c8c8" stroke="#8a5050" stroke-width="1.5"/>
      <text x="${LP + aW / 2}" y="${4 + BH / 2 + 4}" text-anchor="middle" font-size="11" font-weight="700" fill="#8a5050">${startValue}</text>
      <text x="${LP - 4}" y="${4 + BH + GAP + BH / 2 + 4}" text-anchor="end" font-size="10" font-weight="700" fill="#507850">B</text>
      <rect x="${LP}" y="${4 + BH + GAP}" width="${bW}" height="${BH}" rx="4" fill="#c8e4c0" stroke="#507850" stroke-width="1.5"/>
      <text x="${LP + bW / 2}" y="${4 + BH + GAP + BH / 2 + 4}" text-anchor="middle" font-size="11" font-weight="700" fill="#507850">${amount}</text>
      ${answered ? `<text x="${LP - 4}" y="${4 + (BH + GAP) * 2 + BH / 2 + 4}" text-anchor="end" font-size="10" font-weight="700" fill="${rStroke}">=</text>
        <rect x="${LP}" y="${4 + (BH + GAP) * 2}" width="${rW}" height="${BH}" rx="4" fill="${rFill}" stroke="${rStroke}" stroke-width="1.5"/>
        <text x="${LP + rW / 2}" y="${4 + (BH + GAP) * 2 + BH / 2 + 4}" text-anchor="middle" font-size="11" font-weight="700" fill="${rStroke}">${result}</text>` : ''}
    </svg>
  </div>`;
}

function renderFingers(startValue, amount, direction, lastAttempt) {
  const sign = direction === 'add' ? '+' : '−';
  if (startValue > 10 || amount > 10) {
    return `<div class="viz-fingers viz-msg"><div class="grid-label">${startValue} ${sign} ${amount}</div><p>Finger view supports 0–10 only</p></div>`;
  }
  const FW = 9, FH = 28, FG = 3, PALM_H = 14;
  const HAND_W = 5 * FW + 4 * FG;
  const SVG_W = HAND_W * 2 + 20, SVG_H = FH + PALM_H + 12;
  function fingerRect(x, y, raised, fill, stroke) {
    return raised
      ? `<rect x="${x}" y="${y}" width="${FW}" height="${FH}" rx="${FW / 2}" fill="${fill}" stroke="${stroke}" stroke-width="1"/>`
      : `<rect x="${x}" y="${y + FH - 8}" width="${FW}" height="8" rx="${FW / 2}" fill="${fill}" stroke="${stroke}" stroke-width="1" opacity="0.45"/>`;
  }
  const leftA  = Math.min(startValue, 5);
  const rightA = Math.max(0, startValue - 5);
  const rightB = Math.min(amount, 5 - rightA);
  const shapes = [];
  // Left hand
  shapes.push(`<rect x="0" y="${FH + 2}" width="${HAND_W}" height="${PALM_H}" rx="4" fill="#f0c8c8" stroke="#8a5050" stroke-width="1"/>`);
  shapes.push(`<text x="${HAND_W / 2}" y="${SVG_H - 1}" text-anchor="middle" font-size="8" fill="#8a5050">A</text>`);
  for (let i = 0; i < 5; i++) {
    const raised = i < leftA;
    shapes.push(fingerRect(i * (FW + FG), 2, raised, raised ? '#f0c8c8' : '#f0ebe0', raised ? '#8a5050' : '#c8c4bc'));
  }
  // Right hand
  const rx = HAND_W + 20;
  const rPalmFill = rightA > 0 ? '#f0c8c8' : '#c8e4c0';
  const rPalmStroke = rightA > 0 ? '#8a5050' : '#507850';
  shapes.push(`<rect x="${rx}" y="${FH + 2}" width="${HAND_W}" height="${PALM_H}" rx="4" fill="${rPalmFill}" stroke="${rPalmStroke}" stroke-width="1"/>`);
  shapes.push(`<text x="${rx + HAND_W / 2}" y="${SVG_H - 1}" text-anchor="middle" font-size="8" fill="${rPalmStroke}">B</text>`);
  for (let i = 0; i < 5; i++) {
    let fill, stroke, raised;
    if (i < rightA)            { raised = true;  fill = '#f0c8c8'; stroke = '#8a5050'; }
    else if (i < rightA + rightB) { raised = true;  fill = '#c8e4c0'; stroke = '#507850'; }
    else                        { raised = false; fill = '#f0ebe0'; stroke = '#c8c4bc'; }
    shapes.push(fingerRect(rx + i * (FW + FG), 2, raised, fill, stroke));
  }
  return `<div class="viz-fingers">
    <div class="grid-label">${startValue} ${sign} ${amount}</div>
    <svg width="${SVG_W}" height="${SVG_H}" viewBox="0 0 ${SVG_W} ${SVG_H}">${shapes.join('')}</svg>
    <div class="grid-legend">
      <span class="grid-key"><span class="grid-dot grid-dot-a"></span> A = ${startValue}</span>
      <span class="grid-key"><span class="grid-dot grid-dot-b"></span> B = ${amount}</span>
    </div>
  </div>`;
}

// ── 10×10 number grid (operand visualization) — legacy export ─────────────────

export function numberGridHTML(exercise, supportLevel) {
  if (!exercise || supportLevel === 3 || isMentalOnlySkill(exercise.skillId)) return '';
  if (exercise.ops) return '';
  const { startValue, amount, direction } = exercise;
  if (typeof startValue !== 'number' || typeof amount !== 'number') return '';

  const CELL = 14, GAP = 2, COLS = 10, ROWS = 10;
  const PAD = 2;
  const W = COLS * (CELL + GAP) - GAP + PAD * 2;
  const H = ROWS * (CELL + GAP) - GAP + PAD * 2;

  const A_FILL = '#d8a0a0', A_STROKE = '#8a5050';
  const B_FILL = '#a0c898', B_STROKE = '#507850';
  const EMPTY_STROKE = '#d4d0c8';

  const aCount = Math.max(0, Math.min(100, startValue));
  const bStart = aCount;
  const bCount = Math.max(0, Math.min(amount, 100 - bStart));

  const cells = [];
  for (let i = 0; i < COLS * ROWS; i++) {
    const r = Math.floor(i / COLS);
    const c = i % COLS;
    const cx = c * (CELL + GAP) + CELL / 2 + PAD;
    const cy = r * (CELL + GAP) + CELL / 2 + PAD;
    const radius = CELL / 2 - 2;
    let fill, stroke;
    if (i < aCount) {
      fill = A_FILL; stroke = A_STROKE;
    } else if (i >= bStart && i < bStart + bCount) {
      fill = B_FILL; stroke = B_STROKE;
    } else {
      fill = 'none'; stroke = EMPTY_STROKE;
    }
    cells.push(`<circle cx="${cx}" cy="${cy}" r="${radius}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`);
  }

  // 5/5 vertical divider for easy counting
  const dividerX = 5 * (CELL + GAP) - GAP / 2 + PAD;
  cells.push(`<line x1="${dividerX}" y1="${PAD}" x2="${dividerX}" y2="${H - PAD}" stroke="#718096" stroke-width="1.5"/>`);

  const sign = direction === 'add' ? '+' : '−';
  return `<div class="number-grid">
    <div class="grid-label">${startValue} ${sign} ${amount}</div>
    <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${cells.join('')}</svg>
    <div class="grid-legend">
      <span class="grid-key"><span class="grid-dot grid-dot-a"></span> A = ${startValue}</span>
      <span class="grid-key"><span class="grid-dot grid-dot-b"></span> B = ${amount}</span>
    </div>
  </div>`;
}

// ── Keyboard legend ───────────────────────────────────────────────────────────

export function keyboardLegendHTML(inputMode, supportLevel, hintsVisible, numCols = 1, skillId = null) {
  if (supportLevel === 3 || !hintsVisible || isMentalOnlySkill(skillId)) return '';
  const addKeys  = [['J','+1'],['K','+2'],['L','+3'],[';','+4'],['U','+5'],['I','+10']];
  const subKeys  = [['F','−1'],['D','−2'],['S','−3'],['A','−4'],['R','−5'],['E','−10']];
  const mkKey = ([k, v]) => `<span class="legend-key"><kbd>${k}</kbd><span>${v}</span></span>`;
  const colNav = numCols > 1
    ? `<div class="legend-row legend-controls"><kbd>[</kbd> col left &nbsp; <kbd>]</kbd> col right</div>`
    : '';
  return `<div class="keyboard-legend">
    <div class="legend-row">
      <strong>Add:</strong> ${addKeys.map(mkKey).join('')}
    </div>
    <div class="legend-row">
      <strong>Sub:</strong> ${subKeys.map(mkKey).join('')}
    </div>
    ${colNav}
    <div class="legend-row legend-controls">
      <kbd>Enter</kbd> submit &nbsp;
      <kbd>Space</kbd> next &nbsp;
      <kbd>Esc</kbd> clear &nbsp;
      <kbd>⌫</kbd> undo &nbsp;
      <kbd>Tab</kbd> mode &nbsp;
      <kbd>H</kbd> hints
    </div>
  </div>`;
}

// ── Sequence panel ────────────────────────────────────────────────────────────

export function sequencePanelHTML(inputSequence, isMental) {
  if (isMental) return '';
  const labels = sequenceToLabels(inputSequence);
  const chips = labels.length
    ? labels.map(l => `<span class="token-chip">${l}</span>`).join(' ')
    : '<span class="seq-empty">—</span>';
  return `<div class="sequence-panel">
    <span class="seq-label">Sequence:</span> ${chips}
  </div>`;
}

// ── Rule hint ─────────────────────────────────────────────────────────────────

export function hintsHTML(exercise, supportLevel, hintsVisible) {
  if (!exercise || supportLevel >= 1 || !hintsVisible || isMentalOnlySkill(exercise.skillId)) return '';
  return `<div id="hints"><strong>Rule:</strong> ${exercise.expectedRule}</div>`;
}

// ── Feedback ──────────────────────────────────────────────────────────────────

export function feedbackHTML(attempt, transition, supportLevel) {
  if (!attempt) return '';
  const ok = attempt.correct;
  const showTransition = supportLevel < 3 && transition;
  const isSeqMode = !!attempt.userSequence;

  const seqSection = isSeqMode
    ? sequenceFeedbackHTML(attempt.userSequence, attempt.expectedSequence)
    : `Expected: <strong>${attempt.expectedResult}</strong> &nbsp; Got: ${attempt.actualResult ?? 'invalid input'}`;

  return `<div id="feedback" class="${ok ? 'correct' : 'incorrect'}">
    <strong>${ok ? '✓ Correct' : '✗ Incorrect'}</strong><br>
    ${seqSection}
    <br>Rule: ${attempt.rule} &nbsp; Latency: ${attempt.latencyMs}ms &nbsp; Supp.dep: ${attempt.supportDependency}
    ${showTransition ? `<hr>
      <em>${transition.explanation}</em>
      <ol>${transition.steps.map(s => `<li>${s}</li>`).join('')}</ol>
      ${transition.carryNeeded  ? '<p class="note">↑ Carry to next column would be needed.</p>' : ''}
      ${transition.borrowNeeded ? '<p class="note">↓ Borrow from next column would be needed.</p>' : ''}
    ` : ''}
  </div>`;
}

function sequenceFeedbackHTML(userSeq, expectedSeq) {
  const maxLen = Math.max(userSeq.length, expectedSeq.length);
  const rows = Array.from({ length: maxLen }, (_, i) => {
    const u = userSeq[i];
    const e = expectedSeq[i];
    const match = u && e && u.direction === e.direction && u.amount === e.amount;
    const uLabel = u ? operationTokenToLabel(u) : '<em>missing</em>';
    const eLabel = e ? operationTokenToLabel(e) : '<em>extra</em>';
    return `<tr>
      <td>${i + 1}</td>
      <td class="token-chip ${match ? 'correct' : 'incorrect'}">${uLabel}</td>
      <td class="token-chip">${eLabel}</td>
      <td>${match ? '✓' : '✗'}</td>
    </tr>`;
  });
  return `<table class="seq-table">
    <thead><tr><th>#</th><th>You</th><th>Expected</th><th></th></tr></thead>
    <tbody>${rows.join('')}</tbody>
  </table>`;
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export function dashboardHTML(progress) {
  return `<table class="dashboard-table">
    <thead><tr>
      <th>Skill</th><th>License</th>
      <th>Att.</th><th>Acc.</th><th>Latency</th><th>Supp.Dep.</th><th>Gate</th>
    </tr></thead>
    <tbody>
      ${getAllSkills().map(skill => {
        const p = progress[skill.id];
        const checks = getMasteryBlockers(skill.id, progress);
        const isMastered = p.status === STATUS.MASTERED;
        const rowClass = p.status === STATUS.LOCKED ? 'row-locked'
          : p.status === STATUS.MASTERED    ? 'row-mastered'
          : p.status === STATUS.PROVISIONAL ? 'row-provisional'
          : p.status === STATUS.RUSTY       ? 'row-rusty' : '';
        return `<tr class="${rowClass}">
          <td>${skill.label}${!skill.implemented ? ' <em>(soon)</em>' : ''}</td>
          <td>${LICENSE[p.status] ?? '—'}</td>
          <td>${p.attempts}</td>
          <td>${p.accuracy}%</td>
          <td>${p.avgLatencyMs ? p.avgLatencyMs + 'ms' : '—'}</td>
          <td>${p.avgSupportDependency || '—'}</td>
          <td class="gate-cell">${isMastered ? '<span class="pass">All gates passed</span>'
            : checks.map(c => `<span class="${c.pass ? 'pass' : 'fail'}">${c.metric}: ${c.message}</span>`).join(' &nbsp; ')}</td>
        </tr>`;
      }).join('\n')}
    </tbody>
  </table>`;
}

// ── Attempt log ───────────────────────────────────────────────────────────────

export function attemptLogHTML(attemptLog) {
  const recent = [...attemptLog].reverse().slice(0, 10);
  if (!recent.length) return '<p><em>No attempts yet.</em></p>';
  return `<table>
    <thead><tr>
      <th>Skill</th><th>Prompt</th><th>Input</th>
      <th>Expected</th><th>OK</th><th>Rule</th><th>Latency</th>
    </tr></thead>
    <tbody>
      ${recent.map(a => `<tr class="${a.correct ? '' : 'row-incorrect'}">
        <td>${a.skillId}</td>
        <td>${a.prompt}</td>
        <td>${a.userInput}</td>
        <td>${a.expectedResult}</td>
        <td>${a.correct ? '✓' : '✗'}</td>
        <td>${a.rule}</td>
        <td>${a.latencyMs}ms</td>
      </tr>`).join('\n')}
    </tbody>
  </table>`;
}

// ── Skill tree node map ───────────────────────────────────────────────────────

export function skillTreeHTML(progress, selectedSkillId) {
  const skills = getAllSkills();

  const NODE_W = 136, NODE_H = 30, RX = 8;
  const LEFT = 118, RIGHT = 362, MID = 240, SVG_W = 480;
  const ROW = 54;

  const POS = {
    direct_add_1_4:           { x: LEFT,  y: 28       },
    direct_subtract_1_4:      { x: RIGHT, y: 28       },
    five_complement_add:      { x: LEFT,  y: 28+ROW   },
    five_complement_subtract: { x: RIGHT, y: 28+ROW   },
    ten_complement_add:       { x: LEFT,  y: 28+ROW*2 },
    ten_complement_subtract:  { x: RIGHT, y: 28+ROW*2 },
    carry:                    { x: LEFT,  y: 28+ROW*3 },
    borrow:                   { x: RIGHT, y: 28+ROW*3 },
    two_digit_add:            { x: LEFT,  y: 28+ROW*4 },
    two_digit_subtract:       { x: RIGHT, y: 28+ROW*4 },
    two_digit_mixed:          { x: MID,   y: 28+ROW*5 },
    ghost_mode:               { x: MID,   y: 28+ROW*6 },
    still_hands:              { x: MID,   y: 28+ROW*7 },
    mental_only:              { x: MID,   y: 28+ROW*8 },
  };

  const SVG_H = 28 + ROW * 8 + 28;

  const SHORT = {
    direct_add_1_4:           'Direct Add 1–4',
    direct_subtract_1_4:      'Direct Sub 1–4',
    five_complement_add:      '5-Comp Add',
    five_complement_subtract: '5-Comp Sub',
    ten_complement_add:       '10-Comp Add',
    ten_complement_subtract:  '10-Comp Sub',
    carry:                    'Carry (2-col)',
    borrow:                   'Borrow (2-col)',
    two_digit_add:            '2-Digit Add',
    two_digit_subtract:       '2-Digit Sub',
    two_digit_mixed:          'Mixed 2-Digit',
    ghost_mode:               'Ghost Mode',
    still_hands:              'Still Hands',
    mental_only:              'Mental Soroban',
  };

  const STYLE = {
    locked:      { fill: '#f4f2ee', stroke: '#d4d0c8', text: '#aaa89e', weight: '400' },
    learning:    { fill: '#e8f2e8', stroke: '#a0c898', text: '#4e7848', weight: '600' },
    provisional: { fill: '#f0ebe0', stroke: '#c8b89a', text: '#786858', weight: '600' },
    mastered:    { fill: '#daeeda', stroke: '#7ab890', text: '#4e7848', weight: '700' },
    rusty:       { fill: '#fdf6e8', stroke: '#d4b878', text: '#786848', weight: '600' },
  };

  const ICON = { locked: '', learning: '', provisional: '◑ ', mastered: '✓ ', rusty: '⚠ ' };

  const edges = skills.flatMap(skill =>
    skill.prerequisites.map(prereqId => {
      const f = POS[prereqId], t = POS[skill.id];
      const fy = f.y + NODE_H / 2, ty = t.y - NODE_H / 2;
      const mid = (fy + ty) / 2;
      return `<path d="M ${f.x} ${fy} C ${f.x} ${mid}, ${t.x} ${mid}, ${t.x} ${ty}"
        fill="none" stroke="#d1d5db" stroke-width="2" stroke-linecap="round"/>`;
    })
  );

  const nodes = skills.map(skill => {
    const { x, y } = POS[skill.id];
    const status = progress[skill.id]?.status ?? 'locked';
    const st = STYLE[status] ?? STYLE.locked;
    const isSelected = skill.id === selectedSkillId;
    const label = SHORT[skill.id] ?? skill.label;

    return `<g class="skill-node" data-skill-id="${skill.id}" style="cursor:pointer">
      <rect x="${x - NODE_W / 2}" y="${y - NODE_H / 2}" width="${NODE_W}" height="${NODE_H}" rx="${RX}"
        fill="${isSelected ? '#daeeda' : st.fill}"
        stroke="${isSelected ? '#a0c898' : st.stroke}"
        stroke-width="${isSelected ? 2.5 : 1.5}"/>
      <text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle"
        font-size="12" font-family="'Fredoka',system-ui,sans-serif"
        fill="${isSelected ? '#4e7848' : st.text}"
        font-weight="${isSelected ? '700' : st.weight}">
        ${ICON[status]}${label}
      </text>
    </g>`;
  });

  return `<div class="skill-tree-wrap">
    <div class="skill-tree-tracks">
      <span>Add track</span><span>Subtract track</span>
    </div>
    <svg viewBox="0 0 ${SVG_W} ${SVG_H}" width="${SVG_W}" class="skill-tree-svg">
      ${edges.join('\n      ')}
      ${nodes.join('\n      ')}
    </svg>
  </div>`;
}

// ── Provisional notice ────────────────────────────────────────────────────────

export function provisionalNoticeHTML(skillId, progress) {
  const p = progress[skillId];
  if (p?.status !== STATUS.PROVISIONAL) return '';
  const since = new Date(p.provisionalSince);
  return `<div class="notice-provisional">
    ◑ <strong>Provisional mastery reached!</strong>
    Come back after 24 h to confirm. (Reached: ${since.toLocaleString()})
  </div>`;
}
