# Soroban VM POC

A keyboard-driven soroban arithmetic state-machine trainer. The goal is measurable skill progression from external scaffolding to internal mental execution.

## How to run

Open `index.html` directly in a browser. No build step, no server, no npm.

## Project structure

```
index.html            — static HTML shell with named container divs
css/style.css         — minimal layout styles
js/
  app.js              — entry point: wires modules, owns app loop
  config.js           — all constants and thresholds
  state.js            — initial state factory
  storage.js          — localStorage only, no logic
  engine/
    soroban.js        — digit ↔ bead column conversion
    rules.js          — rule detection (pure function)
    operations.js     — full transition result with explanation and steps
  trainer/
    skills.js         — skill tree and prerequisite checks
    gates.js          — mastery gate thresholds and blocker messages
    exercises.js      — exercise generation per skill
    scoring.js        — answer evaluation and attempt record
    progress.js       — progress updates and skill unlocking
  ui/
    views.js          — HTML string factories (no DOM access)
    render.js         — writes HTML strings into DOM containers
    events.js         — event delegation, keyboard shortcuts
```

## How the soroban engine works

A single digit is represented as `{ upper: 0|1, lower: 0|1|2|3|4 }`.  
Value = `upper × 5 + lower`.

`rules.js` classifies any `(currentDigit, direction, amount)` triple into one of six rules:

| Rule | Condition |
|------|-----------|
| DIRECT_ADD | result 0–9, stays below 5 or already ≥5 |
| DIRECT_SUBTRACT | result 0–9, stays ≥5 or already <5 |
| FIVE_COMPLEMENT_ADD | current < 5, result ≥ 5 (upper bead needed) |
| FIVE_COMPLEMENT_SUBTRACT | current ≥ 5, result < 5 (upper bead released) |
| TEN_COMPLEMENT_ADD | result ≥ 10 (carry needed) |
| TEN_COMPLEMENT_SUBTRACT | result < 0 (borrow needed) |

`operations.js` calls `rules.js` and returns a full `TransitionResult` with explanation text, step-by-step breakdown, and `carryNeeded`/`borrowNeeded` flags.

## How skills and gates work

Skills are defined in `trainer/skills.js` as a tree with prerequisites. A skill's status is `locked → learning → mastered`. A skill moves from locked to learning once all prerequisites reach mastered.

Mastery is checked after every attempt in `app.js` using `gates.js`. Default gate (all skills except `mental_only`):

- ≥10 attempts
- ≥90% accuracy
- avg latency ≤ 5000ms
- avg support dependency ≤ 3

`mental_only` gate requires avg support dependency = 0 (no hints at all).

## How support levels work

| Level | Name | Before attempt | After attempt |
|-------|------|----------------|---------------|
| 0 | Full Support | show rule + soroban state | full transition |
| 1 | No Rule Hint | soroban state only | full transition |
| 2 | No Transition Hint | soroban state only | full transition |
| 3 | Mental Only | nothing | nothing |

Each level adds a `supportDependency` score to the attempt. High dependency blocks mastery even with high accuracy.

## How to add a new skill

1. Add an ID constant to `SKILL_IDS` in `config.js`.
2. Add the skill entry to `SKILL_TREE` in `trainer/skills.js` with its prerequisites.
3. Add a generator function to `trainer/exercises.js` and a case in `generateExercise`.
4. If the skill needs a custom mastery gate, add it to `trainer/gates.js`.

## How to change mastery thresholds

Edit `DEFAULT_MASTERY_GATE` or `MENTAL_ONLY_GATE` in `js/config.js`. All gates are centralised there.

## Known limitations

- 1-digit operations only (POC)
- No full multi-column carry/borrow — carry and borrow are flagged but not propagated
- No polished UI
- No accounts, backend, or server
- No spaced repetition — attempts are counted but not scheduled

## Next development steps

1. Add multi-column soroban state (hundreds, tens, units).
2. Implement real carry/borrow propagation across columns.
3. Add timed drill mode with countdown.
4. Add spaced repetition / retention checks.
5. Add ghost mode / hands-still mode (show correct bead movement after wrong answer).
6. Add a test suite (pure engine modules are easy to unit-test without a browser).
7. Add better keyboard layout (e.g. numpad-optimised shortcuts).
8. Migrate to TypeScript once architecture stabilises.
9. Add a visual SVG/Canvas bead renderer to replace the text table.
10. Add user profiles and backend only after core training loop is validated.
