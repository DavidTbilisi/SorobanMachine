/** Maps lowercase key character → operation token */
export const SHORTCUT_MAP = {
  // Right hand — addition
  j: { direction: 'add', amount: 1 },
  k: { direction: 'add', amount: 2 },
  l: { direction: 'add', amount: 3 },
  ';': { direction: 'add', amount: 4 },
  u: { direction: 'add', amount: 5 },
  i: { direction: 'add', amount: 10 },
  // Left hand — subtraction
  f: { direction: 'subtract', amount: 1 },
  d: { direction: 'subtract', amount: 2 },
  s: { direction: 'subtract', amount: 3 },
  a: { direction: 'subtract', amount: 4 },
  r: { direction: 'subtract', amount: 5 },
  e: { direction: 'subtract', amount: 10 },
};

/**
 * @param {string} key  raw e.key value
 * @returns {{ direction: string, amount: number }|null}
 */
export function keyToOperationToken(key) {
  return SHORTCUT_MAP[key.toLowerCase()] ?? null;
}

const COL_PREFIX = ['', 'T', 'H'];  // col 0 = ones (no prefix), col 1 = tens, col 2 = hundreds

/**
 * @param {{ col?: number, direction: string, amount: number }} token
 * @returns {string}  e.g. "+5", "−2", "T+1"
 */
export function operationTokenToLabel(token) {
  const col    = token.col ?? 0;
  const prefix = col > 0 ? (COL_PREFIX[col] ?? `C${col}`) : '';
  const sign   = token.direction === 'add' ? '+' : '−';
  return `${prefix}${sign}${token.amount}`;
}

/** @param {Array} sequence @returns {string[]} */
export function sequenceToLabels(sequence) {
  return (sequence ?? []).map(operationTokenToLabel);
}

/**
 * Deep-equals two token arrays by direction and amount.
 * @param {Array} a @param {Array} b @returns {boolean}
 */
export function sequencesEqual(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  return a.every((t, i) =>
    t.direction === b[i].direction &&
    t.amount    === b[i].amount &&
    (t.col ?? 0) === (b[i].col ?? 0)
  );
}
