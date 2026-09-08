# CLOUDVERSE — Accessibility & performance

## How this was checked

Not by eye. The app is audited with axe-core running against the real
rendered page in Chromium, plus a keyboard walk of the full tab order
and a contrast calculation done against the *effective*
background — every semi-transparent layer composited down to the page
behind it, because the panels here are glass surfaces and a naive
check reads the wrong colour.

## What the audit found, and what was done

| Finding | Fix |
|---|---|
| No `main` landmark on either screen | `<main id="main-content">` in the app shell, so screen-reader users can jump to content and axe's `landmark-one-main` passes |
| Four defense toggles all announced as "ON" | `aria-label` naming each rule — the visible label lives in a sibling element, so the button alone had nothing to say |
| No way to skip the panels with a keyboard | Skip link as the first element in the tab order, offscreen until focused |
| `.threat-panel__waiting` at 4.04:1, under the 4.5:1 minimum | Moved from `--text-muted` to `--text-secondary` (now 7.49:1) |

## Current state, stated precisely

**Method:** axe-core 4.x executed against the rendered page in headless
Chromium (Playwright), default rule set, `resultTypes: ['violations']`.

**Last run:** 2026-09-08, against the commit that added Security
Intelligence.

**Surfaces covered — 10:**

| Surface | States audited |
|---|---|
| World Map | as loaded |
| Cloud District | as loaded |
| DevOps District | as loaded |
| Cyber · Operations | empty feed, and after a played round |
| Cyber · Incident Response | open case |
| Cyber · Security Analytics | with recorded events |
| Cyber · Digital Forensics | fresh, mid-investigation, at the verdict |
| Cyber · Network Operations | fresh queue, and after a shift of decisions |
| Cyber · Security Intelligence | no sightings, and with sightings |
| Cyber · an unavailable sector | the locked/offline panel |

**Result:** 0 violations on every surface listed, at 1440px and at 400px.

**What that does and does not mean.** An automated scan is a floor, not
a certificate. axe-core checks what can be checked mechanically —
landmarks, names, roles, contrast, list semantics. It cannot tell
whether a label is *meaningful*, whether an interaction makes sense to a
screen-reader user working through it, or whether the reading order
matches the visual one in a way that helps. **This project has not been
tested with real assistive technology or with disabled users, and no
claim of WCAG conformance is made here.** The unqualified phrase
"accessible" is deliberately avoided throughout the documentation.

Earlier versions of this file said "zero violations on both screens",
which was accurate when there were two and quietly stopped being so as
the district grew. The count above is dated for that reason.

## What already worked

Worth recording, because these were deliberate choices earlier in the
project rather than luck:

- Every interactive control is reachable by keyboard, in a logical
  order, with a visible focus ring. `global.css` uses `:focus-visible`
  rather than `:focus`, which is what stops the ring appearing on mouse
  clicks — the usual reason people delete outlines and break keyboard
  users entirely.
- Toggles and filters use `aria-pressed`, so their state is announced,
  not just coloured.
- Live regions (`role="status"`) carry world health, security score and
  mission completions, so a change is announced rather than only seen.
- `prefers-reduced-motion` is honoured in both CSS and JavaScript —
  `lib/motion.js` exists precisely because CSS alone cannot stop a
  JS-driven animation.
- Contrast passes comfortably almost everywhere: 18 of 19 sampled text
  styles were already above the threshold, most far above.

## Performance

*Measured once, by hand, on 2026-09-08 against the production build
under 4× CPU throttling and a ~1.6 Mbps / 150 ms network — a
deliberately pessimistic profile for a mid-range phone. These are not
re-measured on every change and are not tracked in CI, so treat them as
a dated snapshot rather than a current guarantee. The figures predate
the Forensics, Network Operations and Security Intelligence sectors and
the bundle has grown since.*

| Metric | Result |
|---|---|
| DOMContentLoaded | ~1.0 s |
| Largest Contentful Paint | ~1.14 s |
| Total transferred | 255 kB (240 kB JS + 15 kB CSS) |
| Long tasks over 50 ms | none |
| Frame rate during entrance animation | ~56 fps |

No code-splitting was added. It was considered and rejected: the intro
animation runs at first paint, so deferring the animation library would
move work to exactly the moment it is needed and make the first frame
worse, not better. Splitting here would be a change that looks like an
optimisation while measurably costing time — the numbers above are the
reason to leave it alone.
