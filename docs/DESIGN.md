# Design

CLOUDVERSE should feel like entering a digital world, not like opening an
admin dashboard. This note covers the two pieces of that which are worth
explaining: the cursor, and the surface language that pulled the Cyber
sectors up to the World Map's level.

## The cursor says what the next click is

The interface already knows whether the thing under the pointer inspects
evidence, takes a scored action, or does something destructive. It
normally throws that away. The cursor wears it.

| State | When | Reads as |
|---|---|---|
| `normal` | over text and empty space | small dot, thin ring |
| `interactive` | any control with nothing more specific to say | ring opens |
| `inspect` | evidence artefacts, map nodes, captured packets | wide dashed reticle, blue |
| `action` | threat responses, allow, trace, submit | tight heavy ring, mint |
| `danger` | block, escalate, switching a defense off, clearing the log | tight heavy ring, red |
| `disabled` | anything `disabled` or `aria-disabled` | small, dimmed |

A component declares its own state with `data-cursor`, so `lib/cursor.js`
never has to know feature class names. Disabled is resolved *before* the
declared state: a control that cannot be used must not advertise itself
as an action, whatever it is labelled.

### Three rules it does not break

**It is never required.** Every state is also visible in the element
itself — a disabled button looks disabled, a block button says Block. A
keyboard user who never sees the cursor loses nothing, and focus styling
is untouched.

**Touch gets the native cursor.** The layer only mounts for
`(pointer: fine)`. There is nothing to improve on a touch device, and
hiding the native cursor there would leave someone with nothing to aim.
Text fields keep their caret for the same reason: a ring is a worse
pointer than an I-beam when the job is placing a cursor between two
characters.

**Reduced motion means no trail.** The ring pins to the pointer instead
of easing toward it, and the animation loop never starts — a frame loop
running forever to compute a value that does not change is a battery cost
with no output.

The layer is `pointer-events: none` throughout, so it can never
intercept a click meant for the page beneath it.

## The surface language

The World Map already had depth — glowing conduits, a lit core, an
inspector that feels like a readout. The Cyber sectors were clean and
flat, which is exactly the "repetitive cards" the brief warns about.

Three composable classes in `styles/hud.css` closed the gap without
touching a single component's logic:

- **`.cv-panel`** — corner brackets drawn with borders on two
  pseudo-elements, brightening on hover and on focus-within. Four
  corners, no images, scales with the radius token instead of fighting
  it.
- **`.cv-grid`** — the conduit grid, for surfaces that stand for *space*
  rather than for text: the evidence board, the network map. Masked at
  the edges so it reads as depth rather than as wallpaper.
- **`.cv-live`** — one scan sweep when a live surface appears, and then
  it stops.

Plus a fixed backdrop on `body` — a faint conduit field, brightest at
the top — which lifts every screen including the intro, at the cost of
one element that never scrolls and cannot add to the document height.

Two feature stylesheets had each declared their own copy of the grid.
Both now defer to `.cv-grid`, so there is one definition rather than two
that can drift.

### What this layer is not

It carries no meaning. Delete `hud.css` and every screen still states
its information in text, keeps its contrast, and works by keyboard.
That is the test a decorative layer has to pass, and it is why none of it
is asserted in behaviour tests.

There is also **no infinite ambient animation**. The scan sweep runs once
on mount. The world-health atmosphere changes only when health crosses a
band, which is precisely what makes it information rather than movement.

## Microinteractions

One rule for every control in the app: `button:active` moves down a
pixel. It is the smallest possible confirmation that a click landed,
costs no per-component work, and is off under reduced motion.

Deliberately a translate rather than a scale — scaling a button nudges
the text inside it and makes a crisp label look soft for the length of
the press.
