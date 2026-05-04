/**
 * Converts a digit (0–9) into soroban bead representation.
 * @param {number} value
 * @returns {{ upper: 0|1, lower: 0|1|2|3|4 }}
 */
export function digitToColumn(value) {
  return { upper: value >= 5 ? 1 : 0, lower: value % 5 };
}

/**
 * @param {{ upper: 0|1, lower: 0|1|2|3|4 }} column
 * @returns {number}
 */
export function columnToDigit(column) {
  return column.upper * 5 + column.lower;
}

/** @param {number} value @returns {boolean} */
export function isValidDigit(value) {
  return Number.isInteger(value) && value >= 0 && value <= 9;
}
