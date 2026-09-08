# Security Analytics

The Operations Center is a read-only view over one append-only list. This
note explains why it is built that way, because the shape of the data is
the only interesting decision in it.

## Why a log instead of counters

The obvious way to show "response accuracy" is to keep `correctResponses`
and `totalResponses` on the progress object and divide. That works until
the second question arrives. Accuracy *by severity* needs eight more
counters. "How exposed did this run ever get" needs a running minimum
nobody thought to keep. "How long did investigations take" needs a
duration that was never written down. Each new question costs a new
field, a new migration, and a save file that still cannot answer it for
anything that happened before the field existed.

So the districts record what happened, once, and everything else is
derived:

```js
{ id, type: 'threat-response', at: 1757308800000,
  severity: 'critical', correct: false,
  healthAfter: 80, scoreAfter: 25, allDefensesOn: true }
```

Four event types cover the game: `threat-response`, `defense-toggle`,
`incident-closed`, `mission-completed`. Every chart on the screen is a
function of that array and nothing else, which is why a number there can
always be traced back to the events that produced it — and why a chart
nobody planned can be built later from history that already exists.

## The parts

| Module | Does |
|---|---|
| `game/securityEvents.js` | The event shape, a capped immutable append, and reconciliation of a stored log |
| `game/securityAnalytics.js` | Every reading: totals, accuracy per severity, streaks, the health and score series, incident outcomes, defensive posture |
| `lib/chart.js` | Geometry only — values in, SVG coordinates out |
| `features/analytics/` | The screen and its three chart components |

All three modules are pure. `securityEvents.js` takes `now` from the
caller rather than reading a clock, so the same inputs always produce the
same log and the tests need no fake timers.

## Decisions worth explaining

**The log is capped at 250 events, oldest dropped first.** It lives in
`localStorage`, which is small and shared with the rest of the origin, so
it cannot grow without bound. Dropping the oldest keeps the recent
picture exact and blurs only distant history — the opposite choice would
freeze the log at some point and stop recording the part the player
actually cares about.

**A missing reading is skipped, not plotted as zero.** A response
recorded by an older build carries no `healthAfter`. Drawing that as 0
would put a cliff to nothing in the middle of the line — a gap in the
record is not a crash, and a chart that invents one is worse than a chart
with one fewer point.

**A flat series is drawn through the middle.** Scaling min-to-max when
min equals max would draw a dramatic line for a number that never moved.
There is a third case too: a value that dipped and recovered has the same
first and last reading without ever being flat, and the label says
"ended where it started at 10" rather than "fell from 10 to 10".

**Stacked segments always total exactly 100.** Rounding each share
independently leaves a sliver of the track showing at the end, which
reads as a third category nobody defined. The last segment absorbs the
remainder instead.

**Whole percentages only.** "71.42%" claims a precision this is not
measuring.

**Escalating an investigation is an outcome, not a loss.** The lifecycle
engine in `game/incidentResponse.js` has always permitted the transition
to `escalated` from every open stage; nothing in the UI reached it until
this screen needed somewhere to count it. Handing a case up when it is
beyond you is the correct call often enough that the game should record
it rather than punish it, so nothing is scored for an escalation and the
log keeps it as its own outcome.

## Accessibility

A chart is a picture to one reader and a table to another, and shipping
only the picture leaves the second reader with nothing.

- Each sparkline is an `<svg role="img">` whose `aria-label` states the
  shape in words — direction, endpoints, low and high — and is followed
  by an `.sr-only` `<table>` carrying every plotted value. The label
  alone would describe the trend and withhold the numbers.
- Each severity bar is a real `role="progressbar"` with
  `aria-valuenow` and a label naming the counts, rather than a coloured
  `div` whose meaning is "the green one is longer".
- A severity never met still gets a row, marked "none seen yet". A
  missing row reads as a rendering fault.
- Colour is never the only signal: every state a colour marks is also
  written next to it, including the armed state of the destructive
  "Clear event log" button, which changes its own text as well as its
  colour.

Verified with axe-core in a real Chromium session across all five
screens: 0 violations.

## Scope

Every event, threat, incident and system in CLOUDVERSE is fictional and
simulated. Nothing here describes a real attack technique, tool, or piece
of telemetry.
