# CLOUDVERSE — Testing

*Counts in this document were taken from `npm test` on 2026-09-08 and
match the badge on the README. If they disagree, the test run is right
and this file is stale — please open an issue.*

## What is tested

**397 tests across 27 files.** The suite is not evenly spread, and that
is deliberate:

| Layer | Files | Tests | What is asserted |
|---|---:|---:|---|
| `game/` — the rules | 15 | 263 | Threat lifecycle and severity, defense rules, security score and its streak cap, risk, mission unlock order, incident lifecycle, evidence correlation, containment trade-offs, forensic connection derivation, network traffic judgement, intelligence correlation, sector availability, the event log and its analytics |
| `features/`, `components/` — the UI | 8 | 91 | Rendered output of the World Map, Defense Status, the Cloud↔DevOps bridge, the sector rail, the boot sequence, the event feed, system status, the analytics charts, and the DevOps pipeline |
| `lib/` — presentation maths | 2 | 22 | Sparkline and stacked-segment geometry, cursor state resolution |
| `services/` — the async seam | 1 | 11 | Round-trip, migration from an older saved shape, unknown mission ids, wrong types |
| `storage/` — persistence | 1 | 10 | Privacy mode, quota exhaustion, corrupted JSON, not clearing another app's keys |

An earlier version of this document said components were not tested.
That was true when it was written and stopped being true several
features ago; the eight component test files above are the correction.

## What component tests do and do not do here

They render to a string with `renderToString` and assert on the output.
That is enough to pin the things worth pinning:

- **Semantics.** That the sector rail is a real `tablist` with one tab
  in the tab order, that the event feed's scrolling list is reachable by
  keyboard, that a switch reports `aria-checked`.
- **Wording.** That a state is stated in text and not only in colour —
  `LOCKED` vs `OFFLINE`, `Blocked — but it was legitimate`.
- **Contradictions.** That the Defense Status header cannot say
  `FULLY ACTIVE` while a rule row says `DISABLED`.

They do **not** exercise click handlers, effects, timers or focus
movement, because nothing here mounts into a DOM. Those behaviours are
checked in a real browser instead (below), and that split is the honest
description of the coverage rather than a claim that the components are
"tested" without qualification.

## What is checked in a real browser, not by the suite

A Playwright + axe-core script drives the production behaviour that
string rendering cannot reach. This is a manual step, not part of CI:

- Keyboard navigation of the sector rail (arrows, `Home`, `End`, roving
  tabindex)
- The boot sequence, and that `prefers-reduced-motion` skips it entirely
  rather than playing it faster
- A full round of play: threat responses moving world health, the
  Incident Response gate opening, tracing a forensic chain, judging
  captured traffic, and the resulting events reaching the feed
- The cursor's six states, and its absence on a coarse pointer
- Horizontal overflow at 400px

## Running it

```bash
npm test            # once
npm run test:watch  # while working
npm run lint
npm run build
```

CI runs `lint`, `test` and `build` on every pull request and on pushes
to `main` — see [`.github/workflows/ci.yml`](../.github/workflows/ci.yml).

## Why the rules layer carries most of the weight

`game/` is framework-free — no JSX, no DOM, no `localStorage`. That is
what makes it possible to assert a rule as a plain function rather than
through a rendered component, and it is why most of the suite lives
there. A few of those tests exist because the failure they describe is
easy to reintroduce and hard to notice:

- A saved payload written by an older build must degrade to defaults
  field by field, not be thrown away wholesale.
- Locked and not-yet-built must stay distinguishable, or the rail
  promises something no amount of play will deliver.
- Blocking legitimate traffic must cost something, or the model teaches
  the player to block everything.

## Known gaps

- No end-to-end test runs in CI. The browser checks above are run by
  hand before a release and their results are quoted in the pull request
  that introduced them.
- No visual regression testing.
- Component tests do not cover interaction, as described above.
