import { detectRule } from './rules.js';

/**
 * Applies a soroban operation and returns a full transition result including
 * the expected key-press sequence for training validation.
 * @param {number} currentDigit
 * @param {"add"|"subtract"} direction
 * @param {number} amount
 * @returns {Object}
 */
export function applyOperation(currentDigit, direction, amount) {
  const rule = detectRule(currentDigit, direction, amount);
  const rawResult = direction === 'add' ? currentDigit + amount : currentDigit - amount;
  const carryNeeded  = rawResult >= 10;
  const borrowNeeded = rawResult < 0;
  const after = ((rawResult % 10) + 10) % 10;

  return {
    before: currentDigit,
    direction,
    amount,
    rule,
    after,
    valid: true,
    explanation:      buildExplanation(rule, currentDigit, direction, amount, rawResult),
    steps:            buildSteps(rule, currentDigit, amount, rawResult),
    expectedSequence: buildExpectedSequence(rule, amount),
    carryNeeded,
    borrowNeeded,
  };
}

// ── Explanation text ──────────────────────────────────────────────────────────

function buildExplanation(rule, current, direction, amount, result) {
  switch (rule) {
    case 'DIRECT_ADD':
      return `Direct add: move ${amount} lower bead(s) up. ${current} + ${amount} = ${result}.`;
    case 'DIRECT_SUBTRACT':
      return `Direct subtract: move ${amount} lower bead(s) down. ${current} − ${amount} = ${result}.`;
    case 'FIVE_COMPLEMENT_ADD': {
      const diff = amount - 5;
      if (diff === 0) return `Five-complement add: activate upper bead (+5). ${current} → ${result}.`;
      if (diff < 0) return `Five-complement add: direct +${amount} impossible. Use +5 −${-diff}. ${current} → ${current + 5} → ${result}.`;
      return `Five-complement add: direct +${amount} impossible. Use +5 +${diff}. ${current} → ${current + 5} → ${result}.`;
    }
    case 'FIVE_COMPLEMENT_SUBTRACT': {
      const comp = 5 - amount;
      return `Five-complement subtract: direct −${amount} impossible. Use −5 +${comp}. ${current} → ${current - 5} → ${result}.`;
    }
    case 'TEN_COMPLEMENT_ADD': {
      const comp = 10 - amount;
      return `Ten-complement add: use +10 −${comp}. Digit becomes ${((result % 10) + 10) % 10} with carry. Full result: ${result}.`;
    }
    case 'TEN_COMPLEMENT_SUBTRACT': {
      const comp = 10 - amount;
      return `Ten-complement subtract: use −10 +${comp}. Digit becomes ${((result % 10) + 10) % 10} with borrow. Full result: ${result}.`;
    }
    default: return '';
  }
}

// ── Step-by-step text ─────────────────────────────────────────────────────────

function buildSteps(rule, current, amount, rawResult) {
  switch (rule) {
    case 'DIRECT_ADD':
      return [`Start at ${current}`, `Add ${amount} lower bead(s)`, `Result: ${rawResult}`];
    case 'DIRECT_SUBTRACT':
      return [`Start at ${current}`, `Remove ${amount} lower bead(s)`, `Result: ${rawResult}`];
    case 'FIVE_COMPLEMENT_ADD': {
      const diff = amount - 5;
      const steps = [`Start at ${current}`, `Direct +${amount} impossible (not enough lower beads remaining)`, `Activate upper bead (+5) → ${current + 5}`];
      if (diff < 0) steps.push(`Remove ${-diff} lower bead(s) → ${rawResult}`);
      if (diff > 0) steps.push(`Add ${diff} lower bead(s) → ${rawResult}`);
      return steps;
    }
    case 'FIVE_COMPLEMENT_SUBTRACT': {
      const comp = 5 - amount;
      return [
        `Start at ${current}`,
        `Direct −${amount} impossible (only ${current % 5} lower bead(s) active)`,
        `Remove upper bead (−5) → ${current - 5}`,
        `Add ${comp} lower bead(s) → ${rawResult}`,
      ];
    }
    case 'TEN_COMPLEMENT_ADD': {
      const comp = 10 - amount;
      const after = rawResult % 10;
      return [
        `Start at ${current}`,
        `Direct +${amount} would exceed 9`,
        `Signal carry to next column (+10)`,
        `Remove ${comp} from this column → ${after} (carry needed, full result: ${rawResult})`,
      ];
    }
    case 'TEN_COMPLEMENT_SUBTRACT': {
      const after = ((rawResult % 10) + 10) % 10;
      return [
        `Start at ${current}`,
        `Direct −${amount} would go below 0`,
        `Borrow 10 from next column → ${current + 10}`,
        `Subtract ${amount} → ${after} (borrow applied, full result: ${rawResult})`,
      ];
    }
    default: return [];
  }
}

// ── Expected key sequence ─────────────────────────────────────────────────────

/**
 * Returns the canonical sequence of bead operations for training validation.
 * All amounts are expressible as single shortcut key presses (1,2,3,4,5,10).
 */
function buildExpectedSequence(rule, amount) {
  switch (rule) {
    case 'DIRECT_ADD':
      return [{ direction: 'add', amount }];
    case 'DIRECT_SUBTRACT':
      return [{ direction: 'subtract', amount }];
    case 'FIVE_COMPLEMENT_ADD': {
      const diff = amount - 5;
      const seq = [{ direction: 'add', amount: 5 }];
      if (diff < 0) seq.push({ direction: 'subtract', amount: -diff }); // subtract (5−amount)
      if (diff > 0) seq.push({ direction: 'add',      amount:  diff }); // add (amount−5)
      // diff === 0: just the single +5 step
      return seq;
    }
    case 'FIVE_COMPLEMENT_SUBTRACT': {
      const comp = 5 - amount; // always 1–4 because generator restricts amount 1–4
      return [{ direction: 'subtract', amount: 5 }, { direction: 'add', amount: comp }];
    }
    case 'TEN_COMPLEMENT_ADD': {
      const comp = 10 - amount; // 1–5 because generator restricts amount 5–9
      return [{ direction: 'add', amount: 10 }, { direction: 'subtract', amount: comp }];
    }
    case 'TEN_COMPLEMENT_SUBTRACT': {
      const comp = 10 - amount; // 1–5 because generator restricts amount 5–9
      return [{ direction: 'subtract', amount: 10 }, { direction: 'add', amount: comp }];
    }
    default:
      return [];
  }
}
