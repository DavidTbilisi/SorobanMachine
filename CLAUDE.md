# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the app

Open `index.html` directly in a browser. The runtime has **no build step, no dependencies, no framework** — pure static HTML/CSS/ES-module JS.

A `package.json` exists only to carry **dev-time tooling** for tests:

| Command | What it does |
|---|---|
| `node tests/smoke.mjs` (or `npm test`) | Node-runnable unit/smoke tests for the pure modules (engine, trainer, scoring, view helpers). No browser. |
| `npm run serve` | Starts a tiny dependency-free static server (`scripts/serve.mjs`) on `http://localhost:5173`. |
| `npm run test:e2e` | Playwright e2e suite under `tests/e2e/` — drives a real Chromium against the served app. Covers Daily, Flash, Practice smoke, achievements, certificate, and share-card clipboard contents. |

Playwright is the only npm dep. First-time setup: `npm install && npx playwright install chromium`.

## Architecture layers

Strictly layered — do not bleed concerns across layers:

1. **Engine** (`js/engine/`) — pure arithmetic and soroban logic; no DOM, no storage.
2. **Trainer** (`js/trainer/`) — skills, exercises, scoring, mastery gates, progress tracking; no DOM.
3. **Storage** (`js/storage.js`) — localStorage wrapper only.
4. **UI** (`js/ui/`) — `views.js` returns HTML strings; `render.js` writes them into named DOM containers; `events.js` delegates all events.
5. **Config** (`js/config.js`) — all constants: skill IDs, support levels, per-skill mastery gates, status values, thresholds.

## Status lifecycle

```
locked → learning → provisional → mastered → rusty
                  ↑___________↓  (gate slips back)
```

- **provisional**: gate metrics first pass; recorded in `provisionalSince`. Needs 24 h return session (`PROVISIONAL_HOLD_MS`) before becoming mastered.
- **rusty**: mastered skill not practiced for 14 days (`RUSTY_THRESHOLD_MS`). Applied by `applyRustyDecay()` on startup and after each attempt.
- Status transitions happen only in `app.js:applyStatusTransitions()`.

## Per-skill mastery gates

All thresholds live in `config.js:SKILL_GATES` keyed by skillId. Four metrics must all pass:

| Metric | Description |
|--------|-------------|
| minAttempts | minimum exercise count |
| minAccuracy | % correct |
| maxLatencyMs | average response time |
| maxSupportDependency | weighted average of support level used (0=none, 5=full) |

`trainer/gates.js:getMasteryBlockers()` returns one `{ metric, pass, message }` per metric. `canMasterSkill()` checks `every(c => c.pass)`.

## Skill tree

14 skills from `direct_add_1_4` → `mental_only`. Skills with `implemented: false` in `trainer/skills.js` appear in the dashboard but cannot be practiced (exercise generator throws). Unlocking happens via `trainer/progress.js:unlockEligibleSkills()` — prerequisites must be `mastered`.

## License model

Status maps to a human-readable license in `config.js:LICENSE`:
`locked → —`, `learning → Learner`, `provisional → Operator`, `mastered → Pilot`, `rusty → Rusty`.

## SVG soroban visualization

`views.js:sorobanStateHTML()` renders a before/after pair of SVG columns. Each column shows:
- Upper bead (×5): active = near beam, inactive = near top frame
- 4 lower beads (×1 each): active beads cluster near beam, inactive cluster at bottom frame
- Active = dark blue fill; inactive = light blue fill
- After column revealed only once `state.lastAttempt` is set

## Key data shapes

```js
// Soroban column
{ upper: 0|1, lower: 0|1|2|3|4 }   // value = upper*5 + lower

// Exercise
{ id, skillId, startValue, direction: "add"|"subtract", amount, prompt, expectedRule, expectedResult }

// Attempt
{ id, skillId, exerciseId, prompt, userInput, correct, expectedResult, actualResult,
  rule, latencyMs, supportDependency, supportLevel, errorType, timestamp }

// SkillProgress
{ skillId, status, attempts, correct, accuracy, avgLatencyMs,
  avgSupportDependency, lastPracticedAt, provisionalSince }
```

## Support levels

0 = Full (rule hint shown before, full transition after, soroban visible)
1 = No Rule Hint
2 = No Transition Hint
3 = Mental Only (no soroban, no transition explanation)

Dependency score per level: 5/3/1/0 — high dependency blocks mastery gate.

## Input format

User enters the final numeric answer (`7`, `-5`, `15`). Optional leading `u` stripped. Negative and >9 results are valid (e.g. ten-complement exercises). Parsed in `trainer/scoring.js`.
