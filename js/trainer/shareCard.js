/**
 * Pure formatters for shareable result cards.
 *
 * Output is plain text with emoji — meant to be copied to the clipboard
 * and pasted into chat (Wordle-style). No HTML, no DOM access.
 */

function formatTimeShort(ms) {
  if (!Number.isFinite(ms) || ms < 0) return '–';
  if (ms < 1000) return `${ms}ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(s < 10 ? 1 : 0)}s`;
  const m = Math.floor(s / 60);
  const rem = Math.round(s - m * 60);
  return `${m}m ${rem}s`;
}

/**
 * @param {Object} run         a daily result row
 * @param {number} currentStreak
 * @returns {string}
 */
export function formatDailyShare(run, currentStreak) {
  // Build per-cell to avoid slicing through surrogate pairs (🟩 is 2 UTF-16 units).
  const cells = run.perAnswer.map(a => a.correct ? '🟩' : '🟥');
  const row1 = cells.slice(0, 5).join('');
  const row2 = cells.slice(5, 10).join('');
  const streakLine = currentStreak > 0 ? ` · 🔥${currentStreak}` : '';
  return [
    `🧮 Soroban Machine — Daily ${run.date}`,
    `${run.correct}/${run.total} · ${formatTimeShort(run.totalMs)}${streakLine}`,
    '',
    `${row1} ${row2}`,
  ].join('\n');
}

/**
 * @param {{tier:string, icon:string, correct:number, total:number, message:string}} result
 * @returns {string}
 */
export function formatPlacementShare(result) {
  return [
    `🧮 Soroban Machine — Placement`,
    `${result.icon} ${result.tier} · ${result.correct}/${result.total}`,
    result.message,
  ].join('\n');
}

/**
 * @param {string} presetLabel
 * @param {{count:number, digits:number, speedMs:number}} config
 * @param {{correct:boolean, parsed:(number|null), expected:number}} lastResult
 * @param {{played:number, correct:number, bestStreak:number}} stats
 * @returns {string}
 */
export function formatFlashShare(presetLabel, config, lastResult, stats) {
  const cfg = `${config.count}× ${config.digits}-digit @ ${config.speedMs}ms`;
  const sumLine = lastResult.correct
    ? `✅ ${lastResult.expected}`
    : `❌ ${lastResult.expected} (you: ${lastResult.parsed ?? '–'})`;
  const acc = stats.played ? Math.round(100 * stats.correct / stats.played) : 0;
  return [
    `🧮 Soroban Machine — Flash Anzan`,
    `${presetLabel} · ${cfg}`,
    sumLine,
    `🔥 best ${stats.bestStreak} · ${acc}% over ${stats.played}`,
  ].join('\n');
}
