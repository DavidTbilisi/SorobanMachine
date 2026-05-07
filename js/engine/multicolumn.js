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

  const expectedSequence = buildExpectedSequence(rule, amount, comp);

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
  switch (rule) {
    case 'TEN_COMPLEMENT_ADD':
      return `Carry: ${start} ${op} ${amount} = ${result}. Remove ${comp} from ones, carry +1 to tens.`;
    case 'TEN_COMPLEMENT_SUBTRACT':
      return `Borrow: ${start} ${op} ${amount} = ${result}. Add ${comp} to ones, subtract 1 from tens.`;
    case 'FIVE_COMPLEMENT_ADD': {
      const diff = amount - 5;
      const tail = diff === 0 ? '' : diff < 0 ? ` then −${-diff}` : ` then +${diff}`;
      return `Five-complement on ones: ${start} ${op} ${amount} = ${result}. Activate +5${tail} on the ones rod.`;
    }
    case 'FIVE_COMPLEMENT_SUBTRACT': {
      const diff = amount - 5;
      const tail = diff === 0 ? '' : diff < 0 ? ` then +${-diff}` : ` then −${diff}`;
      return `Five-complement on ones: ${start} ${op} ${amount} = ${result}. Remove −5${tail} on the ones rod.`;
    }
    case 'DIRECT_ADD':
    case 'DIRECT_SUBTRACT':
    default:
      return `${start} ${op} ${amount} = ${result}. Direct on ones rod.`;
  }
}

function buildSteps(rule, amount, comp, onesResult, tensResult) {
  switch (rule) {
    case 'TEN_COMPLEMENT_ADD':
      return [
        `Ones: cannot add ${amount} directly — result exceeds 9`,
        `Ones: remove ${comp} bead(s) → ${onesResult}`,
        `Tens: add 1 (carry) → ${tensResult}`,
      ];
    case 'TEN_COMPLEMENT_SUBTRACT':
      return [
        `Ones: cannot subtract ${amount} directly — result below 0`,
        `Ones: add ${comp} bead(s) (complement) → ${onesResult}`,
        `Tens: subtract 1 (borrow) → ${tensResult}`,
      ];
    case 'FIVE_COMPLEMENT_ADD': {
      const diff = amount - 5;
      const steps = [`Ones: activate upper bead (+5)`];
      if (diff < 0) steps.push(`Ones: remove ${-diff} lower bead(s) → ${onesResult}`);
      if (diff > 0) steps.push(`Ones: add ${diff} lower bead(s) → ${onesResult}`);
      return steps;
    }
    case 'FIVE_COMPLEMENT_SUBTRACT': {
      const diff = amount - 5;
      const steps = [`Ones: remove upper bead (−5)`];
      if (diff < 0) steps.push(`Ones: add ${-diff} lower bead(s) → ${onesResult}`);
      if (diff > 0) steps.push(`Ones: remove ${diff} lower bead(s) → ${onesResult}`);
      return steps;
    }
    case 'DIRECT_ADD':
      return [`Ones: add ${amount} lower bead(s) → ${onesResult}`];
    case 'DIRECT_SUBTRACT':
      return [`Ones: remove ${amount} lower bead(s) → ${onesResult}`];
    default:
      return [];
  }
}

/**
 * Builds the column-aware bead sequence for the given rule.
 * Operations on the ones rod (col 0) for direct/five-complement; carry/borrow
 * to the tens rod (col 1) for ten-complement.
 */
function buildExpectedSequence(rule, amount, comp) {
  switch (rule) {
    case 'DIRECT_ADD':
      return [{ col: 0, direction: 'add', amount }];
    case 'DIRECT_SUBTRACT':
      return [{ col: 0, direction: 'subtract', amount }];
    case 'FIVE_COMPLEMENT_ADD': {
      const diff = amount - 5;
      const seq = [{ col: 0, direction: 'add', amount: 5 }];
      if (diff < 0) seq.push({ col: 0, direction: 'subtract', amount: -diff });
      if (diff > 0) seq.push({ col: 0, direction: 'add',      amount:  diff });
      return seq;
    }
    case 'FIVE_COMPLEMENT_SUBTRACT': {
      const diff = amount - 5;
      const seq = [{ col: 0, direction: 'subtract', amount: 5 }];
      if (diff < 0) seq.push({ col: 0, direction: 'add',      amount: -diff });
      if (diff > 0) seq.push({ col: 0, direction: 'subtract', amount:  diff });
      return seq;
    }
    case 'TEN_COMPLEMENT_ADD':
      return [
        { col: 0, direction: 'subtract', amount: comp },
        { col: 1, direction: 'add',      amount: 1    },
      ];
    case 'TEN_COMPLEMENT_SUBTRACT':
      return [
        { col: 0, direction: 'add',      amount: comp },
        { col: 1, direction: 'subtract', amount: 1    },
      ];
    default:
      return [];
  }
}
