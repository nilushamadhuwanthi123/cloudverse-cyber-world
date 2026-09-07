# CLOUDVERSE — Testing

## What is tested, and why that line

The tests cover `game/`, `services/` and `storage/` — the layers that
hold rules, the data seam, and persistence. They do not cover components.

That split is deliberate rather than lazy. The interesting failures in
this project are rule failures: a mission unlocking out of order, a
streak bonus that keeps paying after a wrong answer, saved progress that
a later build cannot read. Those are decisions, and a decision can be
stated as an example — given this progress, that mission is still
locked. Component tests would mostly assert that a `<span>` renders text
that a `game/` function already returned, which is a slower way to test
the same rule.

Keeping rules framework-free (the architecture doc's reason for `game/`
existing at all) is what makes this possible: every test here is plain
function in, value out, with no DOM and no React.

## Running them

```bash
npm test          # once
npm run test:watch
```

## What each file covers

| File | Covers |
|---|---|
| `game/missionState.test.js` | Unlock order, goal evaluation, the fixed-point settle, immutability |
| `game/securityScore.test.js` | Base points, streak bonus and its cap, reset on a wrong answer, the zero floor |
| `game/threatEngine.test.js` | Threat lifecycle, severity escalation, weighted generation, response resolution |
| `storage/localStore.test.js` | Privacy mode, quota exhaustion, corrupted JSON, not clearing other apps' keys |
| `services/progressService.test.js` | Round-trip, migration from an older saved shape, unknown mission ids, wrong types |

## The cases worth keeping

A few tests exist because the failure they describe is easy to
reintroduce and quiet when it happens:

- **A met goal on a locked mission stays locked.** Otherwise a lucky
  early streak skips the chain the missions are meant to teach.
- **Storage failures degrade to a fresh playable session.** A browser in
  privacy mode throws on `localStorage` access itself, so a version that
  only guarded the parse would still take the page down.
- **A saved shape from an older build still loads.** Progress is written
  by whichever version the player last ran, not the one they open next.
- **The streak resets on a wrong answer.** Without it, one early run of
  correct answers keeps paying a bonus forever.

Each of those is a real behaviour someone could remove while every other
test still passed.
