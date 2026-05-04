import { detectRule } from './rules.js';

/**
 * Applies a 2-column carry or borrow operation and returns the expected
 * bead sequence expressed as column-aware tokens.
 * @param {number} startValue  2-digit start value
 * @param {"add"|"subtract"} direction
 * @param {number} amount      ones-column amount
 * @returns {Object}
 */
export function applyMultiColumnOperation(startValue, direction, amount) {
  const onesStart  = startValue % 10;
  const tensStart  = Math.floor(startValue / 10);
  const rule       = detectRule(onesStart, direction, amount);
  const rawResult  = direction === 'add' ? startValue + amount : startValue - amount;
  const onesResult = rawResult % 10;
  const tensResult = Math.floor(rawResult / 10);
  const comp       = 10 - amount;  // 1–5 (amount is always 5–9)

  const carryNeeded  = rule === 'TEN_COMPLEMENT_ADD';
  const borrowNeeded = rule === 'TEN_COMPLEMENT_SUBTRACT';

  let expectedSequence;
  if (carryNeeded) {
    // Remove comp beads from ones, then carry +1 to tens
    expectedSequence = [
      { col: 0, direction: 'subtract', amount: comp },
      { col: 1, direction: 'add',      amount: 1    },
    ];
  } else if (borrowNeeded) {
    // Add comp beads to ones (complement), then borrow −1 from tens
    expectedSequence = [
      { col: 0, direction: 'add',      amount: comp },
      { col: 1, direction: 'subtract', amount: 1    },
    ];
  } else {
    expectedSequence = [];
  }

  return {
    rule,
    rawResult,
    onesStart, tensStart,
    onesResult, tensResult,
    expectedSequence,
    carryNeeded,
    borrowNeeded,
    explanation: buildExplanation(rule, startValue, direction, amount, rawResult, comp),
    steps:       buildSteps(rule, amount, comp, onesResult, tensResult),
  };
}

function buildExplanation(rule, start, direction, amount, result, comp) {
  const op = direction === 'add' ? '+' : '−';
  if (rule === 'TEN_COMPLEMENT_ADD') {
    return `Carry: ${start} ${op} ${amount} = ${result}. Remove ${comp} from ones, carry +1 to tens.`;
  }
  if (rule === 'TEN_COMPLEMENT_SUBTRACT') {
    return `Borrow: ${start} ${op} ${amount} = ${result}. Add ${comp} to ones, subtract 1 from tens.`;
  }
  return `${start} ${op} ${amount} = ${result}.`;
}

function buildSteps(rule, amount, comp, onesResult, tensResult) {
  if (rule === 'TEN_COMPLEMENT_ADD') {
    return [
      `Ones: cannot add ${amount} directly — result exceeds 9`,
      `Ones: remove ${comp} bead(s) → ${onesResult}`,
      `Tens: add 1 (carry) → ${tensResult}`,
    ];
  }
  if (rule === 'TEN_COMPLEMENT_SUBTRACT') {
    return [
      `Ones: cannot subtract ${amount} directly — result below 0`,
      `Ones: add ${comp} bead(s) (complement) → ${onesResult}`,
      `Tens: subtract 1 (borrow) → ${tensResult}`,
    ];
  }
  return [];
}
