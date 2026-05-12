/**
 * Friend-challenge encoding.
 *
 * A challenge URL is a hash on the regular app page:
 *
 *   #challenge?d=2026-05-12&s=8&t=10&ms=84000&n=David
 *
 * Fields:
 *   d  — date key for the daily set the challenger played (YYYY-MM-DD)
 *   s  — challenger's correct count
 *   t  — total problems
 *   ms — challenger's totalMs (sum of capped per-problem latencies)
 *   n  — challenger's display name (URL-encoded; optional)
 *
 * Pure module: no DOM access, no storage.
 */

import { dateKey } from './daily.js';

const PREFIX = '#challenge?';

/**
 * Build a shareable URL for a finished daily run.
 * @param {string} baseUrl  e.g. window.location.origin + window.location.pathname
 * @param {{date:string, correct:number, total:number, totalMs:number}} run
 * @param {string} [name]
 * @returns {string}
 */
export function buildChallengeUrl(baseUrl, run, name) {
  const params = new URLSearchParams({
    d:  run.date,
    s:  String(run.correct),
    t:  String(run.total),
    ms: String(run.totalMs | 0),
  });
  if (name && name.trim()) params.set('n', name.trim());
  return `${baseUrl}${PREFIX}${params.toString()}`;
}

/**
 * @param {string} hash  window.location.hash (with leading '#')
 * @returns {?{date:string, correct:number, total:number, totalMs:number, name:string}}
 */
export function parseChallengeHash(hash) {
  if (!hash || !hash.startsWith(PREFIX)) return null;
  const qs = hash.slice(PREFIX.length);
  const p  = new URLSearchParams(qs);

  const date = p.get('d');
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;

  const correct = parseInt(p.get('s') ?? '', 10);
  const total   = parseInt(p.get('t') ?? '', 10);
  const totalMs = parseInt(p.get('ms') ?? '', 10);
  if (!Number.isFinite(correct) || !Number.isFinite(total) || total <= 0) return null;
  if (correct < 0 || correct > total) return null;
  if (!Number.isFinite(totalMs) || totalMs < 0) return null;

  const rawName = p.get('n') ?? '';
  const name = rawName.slice(0, 30).replace(/[<>]/g, '');  // light sanitize

  return { date, correct, total, totalMs, name: name || 'A friend' };
}

/** True if the hash represents a challenge invite. */
export function isChallengeHash(hash) {
  return typeof hash === 'string' && hash.startsWith(PREFIX);
}

/**
 * Decide who won a head-to-head: more correct first, then faster time.
 * @returns {'me'|'them'|'tie'}
 */
export function compareRuns(mine, theirs) {
  if (mine.correct !== theirs.correct) return mine.correct > theirs.correct ? 'me' : 'them';
  if (mine.totalMs  !== theirs.totalMs)  return mine.totalMs  < theirs.totalMs  ? 'me' : 'them';
  return 'tie';
}

/** Today's date key — convenience re-export so UI doesn't need to import daily.js too. */
export { dateKey };
