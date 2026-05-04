import { STATUS, SUPPORT_LABELS, LICENSE, SKILL_IDS } from '../config.js';
import { getAllSkills, getLockedReason } from '../trainer/skills.js';
import { getMasteryBlockers } from '../trainer/gates.js';
import { operationTokenToLabel, sequenceToLabels } from '../keyboard/shortcuts.js';

// ── Skill selector ────────────────────────────────────────────────────────────

export function skillSelectorHTML(progress, selectedSkillId) {
  return `<fieldset>
    <legend>Skill</legend>
    ${getAllSkills().map(skill => {
      const p = progress[skill.id];
      const locked = p.status === STATUS.LOCKED;
      const unavailable = locked || !skill.implemented;
      const reason = locked
        ? getLockedReason(skill.id, progress)
        : !skill.implemented ? 'coming soon' : '';
      const badge = p.status === STATUS.MASTERED ? ' ✓' : p.status === STATUS.PROVISIONAL ? ' ◑' : '';
      return `<label class="skill-label ${unavailable ? 'skill-unavailable' : ''}">
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
  const isMental = ex.skillId === SKILL_IDS.MENTAL_ONLY || supportLevel === 3;
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

  const W = 70, H = 220, cx = 35;
  const rx = 13, ry = 9;
  const beamY = 88;
  const beadGap = 27;
  const bottomBase = H - 16;

  const upperCY = upper === 1 ? beamY - ry - 3 : 20;

  const beads = [];
  for (let i = 0; i < lower; i++)
    beads.push({ cy: beamY + ry + 5 + i * beadGap, active: true });
  for (let j = (4 - lower) - 1; j >= 0; j--)
    beads.push({ cy: bottomBase - j * beadGap, active: false });

  const ACTIVE = '#2b6cb0', INACTIVE = '#bee3f8', STROKE = '#1a365d', BEAM = '#b7791f';
  const bead = (cy, active) =>
    `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${active ? ACTIVE : INACTIVE}" stroke="${STROKE}" stroke-width="1.5"/>`;

  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" class="soroban-svg">
    <line x1="${cx}" y1="6" x2="${cx}" y2="${H - 10}" stroke="#bbb" stroke-width="3" stroke-linecap="round"/>
    <rect x="4" y="${beamY - 5}" width="${W - 8}" height="10" fill="${BEAM}" rx="4"/>
    ${bead(upperCY, upper === 1)}
    ${beads.map(b => bead(b.cy, b.active)).join('\n    ')}
    <text x="${cx}" y="${H - 2}" text-anchor="middle" font-size="12" fill="#555" font-family="monospace">${value}</text>
  </svg>`;
}

export function sorobanStateHTML(exercise, lastAttempt, supportLevel, focusedCol = 0) {
  if (!exercise || supportLevel === 3) return '';
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

// ── Keyboard legend ───────────────────────────────────────────────────────────

export function keyboardLegendHTML(inputMode, supportLevel, hintsVisible, numCols = 1) {
  if (supportLevel === 3 || !hintsVisible) return '';
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
  if (!exercise || supportLevel >= 1 || !hintsVisible) return '';
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
