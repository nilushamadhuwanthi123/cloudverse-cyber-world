# 🌌 CLOUDVERSE — Enter the Digital World

An interactive, gamified web experience that turns **Cloud Computing**,
**DevOps** and **Cybersecurity** concepts into a world you explore rather
than a dashboard you read.

[![CI](https://github.com/nilushamadhuwanthi123/cloudverse-cyber-world/actions/workflows/ci.yml/badge.svg)](https://github.com/nilushamadhuwanthi123/cloudverse-cyber-world/actions/workflows/ci.yml)

> **Status: in development.** Two of the three districts are playable —
> Cyber and Cloud — with the shared game layer, persistence and test
> suite behind them. The world map, DevOps district and Core are next.

## Concept

Three districts surround a central Core:

```
                    ☁ CLOUD
                       │
                       │
          🛡 CYBER ─── 🔷 CORE ─── ⚙ DEVOPS
```

| District | Represents |
|---|---|
| ☁ **Cloud** | Compute, storage, databases |
| ⚙ **DevOps** | CI/CD, build, test, deploy, rollback |
| 🛡 **Cyber** | Threat detection, firewall, incident response |
| 🔷 **Core** | Overall world health and system state |

Actions in a district change world health and security score, which the
Core visualises — so the districts are one system, not three dashboards
sharing a page.

## What's built

**Cyber District** — a threat runs a Detected → Analyzing → Active
lifecycle, and the player picks one of three defense actions. The right
one restores world health, a wrong one escalates, and every action
carries an explanation, so a wrong answer still teaches. Threat
generation is system-state based rather than pure random: a district
already under strain sees proportionally more of its severe threats.
Alongside it, a firewall panel where switching a rule off starts a slow
health drain for as long as it stays off, and a mission chain that
unlocks in order and survives a page refresh.

**Cloud District** — compute, storage and database locations rendered as
an explorable environment.

**The layer underneath both** — `game/` holds the rules (threat
lifecycle, severity, security score with a streak bonus, mission unlock
order, and a risk reading derived from current exposure rather than
accumulated). `services/` is the async seam over `storage/`, so no
component reaches for `localStorage` itself and progress survives a
refresh — including when storage is unavailable, out of quota, or holds
JSON an older build wrote.

**Quality** — 77 tests across the rule, service and storage layers; lint,
tests and build run on every pull request; zero axe-core accessibility
violations on both districts, verified in a real browser rather than by
eye. See [`docs/TESTING.md`](docs/TESTING.md) and
[`docs/ACCESSIBILITY.md`](docs/ACCESSIBILITY.md) for what was measured
and why the coverage line sits where it does.

## Tech stack

React 19 · Vite · JavaScript (JSX) · CSS3 · SVG · anime.js · localStorage

No TypeScript, Redux, Three.js, backend, or paid services — by design.
The architecture is meant to stay readable, and every dependency has to
earn its place.

> **Note on anime.js:** this project uses **v4**, whose API differs from
> the v3 examples found in most tutorials (`import { animate } from
> 'animejs'`, not a default `anime()` call).

## Architecture

Layered, with a deliberate seam between the UI and where data comes from:

```
UI → Components → Application Logic → Data Layer → Persistence
```

The app is client-side today and says so honestly. It is *API-ready*
because every read and write already goes through `src/services/`, so
swapping those for `fetch()` calls would not require rewriting the UI.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full
reasoning, including where state lives and why.

## Project structure

```
src/
├── app/          application shell, providers, layout
├── components/   shared presentational components (ui/ = primitives)
├── features/     one folder per district
│   ├── cyber/    threat monitor, firewall, incident response
│   ├── cloud/    compute, storage, database
│   ├── devops/   CI/CD pipeline
│   └── core/     central Core — reads from all districts
├── game/         game rules: health, score, risk, missions, unlocks
├── data/         mock content (threats, missions, districts)
├── services/     the seam — swap for a REST API without touching the UI
├── storage/      localStorage adapter
├── styles/       design tokens and global styles
└── lib/          generic helpers (animation, formatting)
```

Every folder carries a short `README.md` explaining what belongs in it —
useful when two people are adding files to the same tree.

## Running locally

```bash
git clone https://github.com/nilushamadhuwanthi123/cloudverse-cyber-world.git
cd cloudverse-cyber-world
npm install
npm run dev
```

| Command | Does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Lint the source |
| `npm test` | Run the test suite once |
| `npm run test:watch` | Run the tests in watch mode |

## Collaboration

Built by two developers working in parallel:

| Developer | Area | Branches |
|---|---|---|
| **Nilusha Madhuwanthi** | Cybersecurity district, full-stack architecture | `feat/cyber-security-system`, `feat/incident-response-engine`, `feat/security-dashboard-and-ux`, `feat/cyber-game-integration` |
| Teammate | Cloud district, DevOps district, world map | `feat/cloud-district`, `feat/devops-pipeline`, `feat/world-map` |

Work happens on feature branches and merges through pull requests that
the other developer reviews. Districts live in separate folders so the
two streams of work rarely touch the same files; where they do meet —
`game/`, `core/`, `styles/`, `components/ui/` — a real review matters.

## Roadmap

| Phase | State |
|---|---|
| Setup · Visual foundation · Intro | done |
| Cyber district | done |
| Cloud district | done |
| Game mechanics · Unlocks | done — scoring, missions, unlock order |
| Responsive · Accessibility & performance | done — zero axe violations |
| Testing | done — 77 tests, CI on every PR |
| Documentation | architecture, testing and accessibility docs written |
| World map | next — a district switcher stands in for now |
| DevOps district | next |
| Event engine · Core · Advanced features | not started |
| Production build · Deployment | build is clean; not deployed yet |

## Disclaimer

CLOUDVERSE is an **educational simulation** of digital infrastructure and
cybersecurity concepts. It does not perform real-world attacks,
penetration testing, network scanning, or real cloud infrastructure
operations. Every threat, incident and system in the application is
fictional data defined inside this repository.
