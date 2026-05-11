import { getAchievementCatalog, isPilotEarned } from '../trainer/achievements.js';
import { LICENSE, SKILL_IDS } from '../config.js';
import { getAllSkills } from '../trainer/skills.js';

// ── Achievements section ─────────────────────────────────────────────────────

export function achievementsHTML(state) {
  const catalog = getAchievementCatalog();
  const unlocked = state.achievements?.unlocked ?? {};
  const total = catalog.length;
  const have = Object.keys(unlocked).filter(id => catalog.find(a => a.id === id)).length;

  const byGroup = {};
  for (const a of catalog) {
    (byGroup[a.group] ??= []).push(a);
  }

  const groupSections = Object.entries(byGroup).map(([group, items]) => {
    const cards = items.map(a => {
      const ts = unlocked[a.id];
      const isUnlocked = !!ts;
      const dateLabel = isUnlocked ? new Date(ts).toLocaleDateString() : '';
      return `<div class="ach-card${isUnlocked ? ' ach-unlocked' : ' ach-locked'}" title="${a.description}">
        <div class="ach-icon">${a.icon}</div>
        <div class="ach-body">
          <div class="ach-label">${a.label}</div>
          <div class="ach-desc">${a.description}</div>
          ${isUnlocked ? `<div class="ach-date">Unlocked ${dateLabel}</div>` : `<div class="ach-date">Locked</div>`}
        </div>
      </div>`;
    }).join('');
    return `<div class="ach-group">
      <h3 class="ach-group-title">${group}</h3>
      <div class="ach-grid">${cards}</div>
    </div>`;
  }).join('');

  const certBtn = isPilotEarned(state)
    ? `<button id="cert-open" class="ach-cert-btn">🏆 View Pilot Certificate</button>`
    : '';

  return `<div class="ach-wrap">
    <div class="ach-header">
      <div class="ach-summary">
        <span class="ach-count">${have} / ${total}</span> achievements unlocked
      </div>
      ${certBtn}
    </div>
    ${groupSections}
  </div>`;
}

// ── Certificate modal ───────────────────────────────────────────────────────

export function certificateHTML(state) {
  const skills = getAllSkills();
  const dateStr = new Date().toLocaleDateString(undefined, {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const skillRows = skills.map(skill => {
    const p = state.progress[skill.id] ?? {};
    return `<tr>
      <td class="cert-skill">${skill.label}</td>
      <td class="cert-accuracy">${p.accuracy ?? 0}%</td>
      <td class="cert-latency">${Math.round((p.avgLatencyMs ?? 0) / 100) / 10}s</td>
      <td class="cert-status">${LICENSE[p.status] ?? '—'}</td>
    </tr>`;
  }).join('');

  return `<div class="cert-sheet" id="cert-sheet">
    <div class="cert-frame">
      <div class="cert-corner cert-corner-tl">❀</div>
      <div class="cert-corner cert-corner-tr">❀</div>
      <div class="cert-corner cert-corner-bl">❀</div>
      <div class="cert-corner cert-corner-br">❀</div>

      <div class="cert-eyebrow">Soroban Machine</div>
      <div class="cert-title">Pilot Certificate</div>
      <div class="cert-sub">awarded for mastery of the complete soroban skill tree</div>

      <div class="cert-seal">🏆</div>

      <table class="cert-table">
        <thead>
          <tr><th>Skill</th><th>Accuracy</th><th>Avg time</th><th>License</th></tr>
        </thead>
        <tbody>${skillRows}</tbody>
      </table>

      <div class="cert-footer">
        <div class="cert-date">
          <div class="cert-line"></div>
          <div class="cert-line-label">Date</div>
          <div class="cert-line-value">${dateStr}</div>
        </div>
        <div class="cert-sig">
          <div class="cert-line"></div>
          <div class="cert-line-label">Issued by</div>
          <div class="cert-line-value">Soroban Machine</div>
        </div>
      </div>
    </div>
  </div>
  <div class="cert-controls no-print">
    <button id="cert-print" class="dc-btn dc-btn-primary">Print / Save PDF</button>
    <button id="cert-close" class="dc-btn">Close</button>
  </div>`;
}
