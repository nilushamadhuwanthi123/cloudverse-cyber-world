# CLOUDVERSE — Architecture

## What this document is for

CLOUDVERSE is built by two developers at once, and it makes a claim on a
portfolio ("full-stack thinking, API-ready data layer") that is only
honest if the code actually backs it up. This document is where that
claim is written down so it can be checked against reality.

## Layers

```
        UI  (JSX, styling, animation)
         │
   Components  (reusable, presentational)
         │
Application Logic  (game rules: health, score, risk, unlocks)
         │
    Data Layer  (services/ — the seam)
         │
   Persistence  (storage/ — localStorage today)
```

Each layer may talk to the one below it. None talks upward, and none
skips a layer to reach two below.

The rule that matters in practice: **a component never imports from
`data/` or `storage/` directly.** It asks `services/`. That single
restriction is what makes the next section possible.

## Why "API-ready" is a real claim, not a slogan

The current version of CLOUDVERSE is entirely client-side. There is no
server, and the README says so plainly.

What makes it *API-ready* is that every read and write already goes
through `services/`. Those functions are async by design even though
nothing they do needs to be yet — so the day they become `fetch()` calls,
their signatures do not change and no component is rewritten:

```
today:      component → services/ → data/ + storage/
with API:   component → services/ → fetch → backend → database
```

If a component imported `data/threats.js` directly, that swap would mean
touching every component that did it. That is the mistake this structure
exists to prevent.

We are not building a backend just to be able to say "full stack". The
honest version — a clean layered client with a documented seam — is worth
more than a server that exists only for the label.

## Where state lives

| State | Owner | Notes |
|---|---|---|
| World health, security score | `game/` | Single source of truth. Both districts write to it, the Core reads it. |
| Mission + unlock progress | `game/` | Persisted through `services/` → `storage/`. |
| Threats, incidents (cyber) | `features/cyber/` | Local to the district until the Core needs it. |
| Cloud / DevOps district state | `features/cloud/`, `features/devops/` | Same rule, owned by the other developer. |
| UI state (open modal, filters) | The component that owns it | Never in shared state. |

The reason world health is shared and threat filters are not: shared
state is the expensive kind. Every value promoted into it becomes
something two people have to coordinate on. World health earns that cost
because the Core visualises it; a filter dropdown does not.

## Working in parallel

Districts are separate folders precisely so that two feature branches
usually touch different files. The places where the two developers'
work genuinely meets are:

- `src/game/` — shared rules and state
- `src/features/core/` — the Core that reads from both districts
- `src/styles/` — design tokens
- `src/components/ui/` — shared primitives

A PR that changes one of those is worth a real read from the other
person, because it can change behaviour they depend on. A PR that only
touches one district folder is usually safe to review quickly.

## Not in scope

- No TypeScript, Redux, or Three.js — see the README's stack section.
- No real network scanning, packet capture, or attack tooling. Every
  "threat" in CLOUDVERSE is a fictional object defined in `data/`.
