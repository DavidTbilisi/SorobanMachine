/**
 * Detects which soroban rule applies for an operation.
 * @param {number} currentDigit
 * @param {"add"|"subtract"} direction
 * @param {number} amount
 * @returns {string}
 */
export function detectRule(currentDigit, direction, amount) {
  const result = direction === 'add' ? currentDigit + amount : currentDigit - amount;
  if (direction === 'add') {
    if (result >= 10) return 'TEN_COMPLEMENT_ADD';
    if (result >= 5 && currentDigit < 5) return 'FIVE_COMPLEMENT_ADD';
    return 'DIRECT_ADD';
  } else {
    if (result < 0) return 'TEN_COMPLEMENT_SUBTRACT';
    if (result < 5 && currentDigit >= 5) return 'FIVE_COMPLEMENT_SUBTRACT';
    return 'DIRECT_SUBTRACT';
  }
}
