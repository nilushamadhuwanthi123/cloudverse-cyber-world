# CLOUDVERSE — Incident response

## Why this is separate from the threat engine

`game/threatEngine.js` already models a threat: it appears, the player
picks one of three actions, it resolves or escalates. That is a single
decision, and it works.

An incident is the long-form version — investigate, gather evidence,
work out what actually happened, contain it, recover, verify. Different
grain, so it is a separate engine rather than more stages bolted onto the
threat lifecycle. Both feed the same world health, security score and
risk; neither owns the other.

## The lifecycle

```
detected → investigating → contained → eradication → recovery → verification → resolved
                                           ↑                          │
                                           └──── verification failed ──┘

          (every live stage can also → escalated)
```

The order *is* the lesson. You cannot recover something you have not
contained, and an incident is not resolved because it looks quiet — it is
resolved because verification said so.

Two rules are deliberate:

- **Escalation is reachable from every live stage.** An incident can get
  away from you at any point. A model where escalation only followed one
  stage would teach the wrong shape.
- **Verification can send the incident back to eradication.** Verification
  exists to catch a fix that did not hold. If it always led to resolved it
  would be a formality rather than a check.

Invalid transitions are **refused, not thrown**. A UI can ask for one by
mistake, and the safe answer is to say why and leave the incident
untouched:

```js
transitionIncident(incident, 'resolved')
// → { ok: false, reason: 'Cannot go from detected to resolved.', incident: <unchanged> }
```

Clocks are injected (`now = () => Date.now()`), the same way
`threatEngine` takes an `rng` — a rule that reaches for ambient state
cannot be tested without faking the world around it. Every transition is
recorded in `history` as it happens, which is where the replay and the
response-time metrics read from.

## The evidence model

Each case carries evidence that matters and evidence that does not:

| Field | Meaning |
|---|---|
| `atMinute` | minutes from detection — what orders the timeline |
| `time` | display label |
| `source` | which fictional system produced the record |
| `eventType` | authentication · application · network · deployment · file · system · privilege |
| `severity` | low · medium · high · critical |
| `relevant` | whether it belongs to the actual chain |
| `correlationId` | groups the records that belong together; `null` for noise |

Noise is not filler. A running system produces backup jobs, cache
warm-ups and replica lag at the same time as an incident, and telling
those apart from the chain is the skill being practised.

## Correlation

Forensics here is deliberately not "click the highlighted item". The
engine scores a **selection**, and reports three things separately,
because they are different mistakes:

- **found** — relevant evidence correctly selected
- **missed** — relevant evidence left behind
- **noise** — irrelevant evidence dragged in

A selection is `complete` only when nothing is missed *and* nothing extra
came with it. Reading the login-burst case in order shows why the chain
matters:

```
09:41  214 failed sign-ins for one account          ┐
09:43  that account signs in successfully           ├─ chain-credential
09:45  the account is added to an admin group       ┘
09:44  nightly backup completed                     ← noise
09:47  cache warm-up ran on schedule                ← noise
```

No single line proves anything. The order does.

## Root cause

Every option returns its explanation, right or wrong. Each wrong option
says why the evidence does not support that reading — a wrong answer that
only says "wrong" teaches nothing, and the explanation is the part worth
having.

## Containment and its cost

A containment decision is a trade. Every action carries both a security
effect and an operational one:

| Action | Risk | Cloud availability | Pipeline |
|---|---|---|---|
| Isolate the affected server | −25 | −30 | — |
| Disable the compromised account | −20 | −5 | — |
| Pause the deployment pipeline | −20 | 0 | blocked |
| Block the outbound endpoint | −15 | 0 | — |
| Raise additional firewall defenses | −10 | −5 | — |

The strongest containment is also the most expensive. That is the point:
an action that only ever helped would be a button, not a decision.

Which actions *address* an incident is a property of the case, not a
ranking — suspending an account is right for stolen credentials and
beside the point for a tampered build artifact. An inappropriate action
is **allowed**, still costs its operational price, and reduces risk only
slightly, because it did not close the way in. Learning that is the
lesson; blocking the click would remove it.

## Cross-district effects

Containment returns its effects as **data** rather than applying them.

Today nothing consumes `cloudAvailability` or `pipelineStatus`: the Cloud
district is self-contained UI with no shared state layer, and the DevOps
district does not exist yet. Emitting the effects anyway keeps the rule
correct now and lets those districts consume it when they grow a state
layer — without this engine changing.

That is the honest status: the cross-district *rule* is built and tested;
the wiring waits on work that belongs to the other developer.

## Testing

Rules live outside React, so every one of these is a plain
function-in, value-out test:

| File | Covers |
|---|---|
| `game/incidentResponse.test.js` | ordered path, skipped and backwards transitions, escalation from every live stage, failed verification looping back, terminal incidents refusing change, immutability, timeline durations |
| `game/evidenceCorrelation.test.js` | timeline ordering, chain grouping, found/missed/noise scoring, root-cause checking, catalogue integrity |
| `game/containment.test.js` | appropriate and inappropriate actions, risk and availability effects, the trade-off itself, summaries |

## Simulated only

Every incident, log line, host, account and address in CLOUDVERSE is
**fictional content defined in this repository**. Nothing here observes,
scans, tests or touches a real system, and no part of this feature
performs or teaches a real-world attack. It is a training simulation for
how a response is *structured* — the order of the phases, what evidence
is worth reading, and what a containment decision costs.
