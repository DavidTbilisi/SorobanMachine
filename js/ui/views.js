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

  const W = 64, H = 174, cx = 32;
  const rx = 13, ry = 9;
  const beamY = 70;
  const beadGap = 22;
  const bottomBase = H - 14;

  const upperCY = upper === 1 ? beamY - ry - 3 : 16;

  const beads = [];
  for (let i = 0; i < lower; i++)
    beads.push({ cy: beamY + ry + 5 + i * beadGap, active: true });
  for (let j = (4 - lower) - 1; j >= 0; j--)
    beads.push({ cy: bottomBase - j * beadGap, active: false });

  const bead = (cy, active, isUpper = false) => {
    const fill   = active ? (isUpper ? 'url(#sg-upper)' : 'url(#sg-lower)') : 'url(#sg-inactive)';
    const stroke = active ? (isUpper ? '#8a5050' : '#507850') : '#c8c4bc';
    const glow   = active ? `<ellipse cx="${cx - rx*0.28}" cy="${cy - ry*0.32}" rx="${rx*0.28}" ry="${ry*0.22}" fill="rgba(255,255,255,0.52)"/>` : '';
    return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" stroke="${stroke}" stroke-width="0.8" filter="url(#sg-drop)"/>
    ${glow}`;
  };

  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" class="soroban-svg">
    <defs>
      <radialGradient id="sg-upper" cx="35%" cy="28%" r="68%" gradientUnits="objectBoundingBox">
        <stop offset="0%"   stop-color="#f8e8e8"/>
        <stop offset="42%"  stop-color="#d8a0a0"/>
        <stop offset="100%" stop-color="#8a5050"/>
      </radialGradient>
      <radialGradient id="sg-lower" cx="35%" cy="28%" r="68%" gradientUnits="objectBoundingBox">
        <stop offset="0%"   stop-color="#e0f0dc"/>
        <stop offset="42%"  stop-color="#a0c898"/>
        <stop offset="100%" stop-color="#507850"/>
      </radialGradient>
      <radialGradient id="sg-inactive" cx="35%" cy="28%" r="68%" gradientUnits="objectBoundingBox">
        <stop offset="0%"   stop-color="#f8f6f2"/>
        <stop offset="50%"  stop-color="#e4e0d8"/>
        <stop offset="100%" stop-color="#c8c4bc"/>
      </radialGradient>
      <linearGradient id="sg-rod" x1="${cx-2}" y1="0" x2="${cx+2}" y2="0" gradientUnits="userSpaceOnUse">
        <stop offset="0%"   stop-color="#686460"/>
        <stop offset="40%"  stop-color="#b4b0a8"/>
        <stop offset="100%" stop-color="#686460"/>
      </linearGradient>
      <linearGradient id="sg-beam" x1="0" y1="${beamY-5}" x2="0" y2="${beamY+5}" gradientUnits="userSpaceOnUse">
        <stop offset="0%"   stop-color="#d4cec8"/>
        <stop offset="40%"  stop-color="#a8a09a"/>
        <stop offset="100%" stop-color="#787470"/>
      </linearGradient>
      <filter id="sg-drop" x="-25%" y="-25%" width="150%" height="150%">
        <feDropShadow dx="0" dy="1.5" stdDeviation="1.2" flood-color="rgba(0,0,0,0.30)"/>
      </filter>
      <filter id="sg-beam-shadow" x="-5%" y="-30%" width="110%" height="160%">
        <feDropShadow dx="0" dy="1" stdDeviation="1" flood-color="rgba(0,0,0,0.22)"/>
      </filter>
    </defs>
    <rect x="${cx-2}" y="4" width="4" height="${H-12}" fill="url(#sg-rod)" rx="2"/>
    <rect x="4" y="${beamY-5}" width="${W-8}" height="10" fill="url(#sg-beam)" rx="3.5" filter="url(#sg-beam-shadow)"/>
    ${bead(upperCY, upper === 1, true)}
    ${beads.map(b => bead(b.cy, b.active, false)).join('\n    ')}
    <text x="${cx}" y="${H-1}" text-anchor="middle" font-size="11" fill="#78746e" font-family="monospace" font-weight="700">${value}</text>
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

// ── 10×10 number grid (operand visualization) ────────────────────────────────

/**
 * 10×10 dot grid showing the two operands of the current exercise:
 * A (startValue) in gold from row 0; B (amount) in purple starting on the
 * first row not occupied by A. Hidden for mental skills, support level 3,
 * and chain exercises (still_hands).
 */
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
