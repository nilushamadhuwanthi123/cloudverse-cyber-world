/**
 * Incident response state engine.
 *
 * A threat in threatEngine.js is a single decision: it appears, the
 * player picks one of three actions, it resolves. An incident is the
 * long-form version — investigate, gather evidence, find the cause,
 * contain it, recover, verify. Different grain, so this is a separate
 * engine rather than more states bolted onto the threat lifecycle.
 *
 * The stages follow the phases a real response team works through, and
 * the point of modelling them at all is that the order is the lesson:
 * you cannot recover something you have not contained, and you do not
 * get to call an incident resolved without verifying it first.
 *
 * Framework-free, like the rest of game/ — no JSX, no DOM, no
 * localStorage. Every function takes state and returns new state, and
 * nothing here mutates its input.
 *
 * Everything is fictional simulation. No real host, account, address or
 * telemetry is involved anywhere in this project (spec 52).
 */

export const INCIDENT_STATE = {
  DETECTED: 'detected',
  INVESTIGATING: 'investigating',
  CONTAINED: 'contained',
  ERADICATION: 'eradication',
  RECOVERY: 'recovery',
  VERIFICATION: 'verification',
  RESOLVED: 'resolved',
  ESCALATED: 'escalated',
}

/**
 * Which stages may follow which.
 *
 * Two entries here are worth explaining rather than skimming:
 *
 * - Every non-terminal stage can go to ESCALATED. An incident can get
 *   away from you at any point, and a model where escalation is only
 *   reachable from one stage would teach the wrong shape.
 *
 * - VERIFICATION can go back to ERADICATION. Verification exists to
 *   catch a fix that did not hold; if it always led to RESOLVED it
 *   would be a formality rather than a check.
 */
const ALLOWED_TRANSITIONS = {
  [INCIDENT_STATE.DETECTED]: [INCIDENT_STATE.INVESTIGATING, INCIDENT_STATE.ESCALATED],
  [INCIDENT_STATE.INVESTIGATING]: [INCIDENT_STATE.CONTAINED, INCIDENT_STATE.ESCALATED],
  [INCIDENT_STATE.CONTAINED]: [INCIDENT_STATE.ERADICATION, INCIDENT_STATE.ESCALATED],
  [INCIDENT_STATE.ERADICATION]: [INCIDENT_STATE.RECOVERY, INCIDENT_STATE.ESCALATED],
  [INCIDENT_STATE.RECOVERY]: [INCIDENT_STATE.VERIFICATION, INCIDENT_STATE.ESCALATED],
  [INCIDENT_STATE.VERIFICATION]: [
    INCIDENT_STATE.RESOLVED,
    INCIDENT_STATE.ERADICATION, // verification failed — the fix did not hold
    INCIDENT_STATE.ESCALATED,
  ],
  [INCIDENT_STATE.RESOLVED]: [],
  [INCIDENT_STATE.ESCALATED]: [],
}

/** An incident that has reached a terminal stage accepts no further transitions. */
export function isTerminal(state) {
  return (ALLOWED_TRANSITIONS[state] ?? []).length === 0
}

/** The stages reachable from here — what a UI should offer, and nothing more. */
export function nextStates(state) {
  return [...(ALLOWED_TRANSITIONS[state] ?? [])]
}

/** Whether one stage may follow another. Unknown stages are simply not allowed. */
export function canTransition(from, to) {
  return (ALLOWED_TRANSITIONS[from] ?? []).includes(to)
}

/**
 * Picks which case to open next.
 *
 * Like threat generation, this reads system state rather than rolling
 * dice in a vacuum: a district already under strain draws its heavier
 * cases more often. Cases already worked are skipped while any remain
 * unseen, so a session moves through the catalogue instead of repeating
 * the first one it liked.
 */
export function pickIncidentCase(cases, { worldHealth = 100, seenIds = [] } = {}, rng = Math.random) {
  const unseen = cases.filter((c) => !seenIds.includes(c.id))
  const pool = unseen.length > 0 ? unseen : cases
  if (pool.length === 0) return null

  const strained = worldHealth < 60
  const weights = pool.map((c) => {
    const heavy = c.severity === 'high' || c.severity === 'critical'
    return strained && heavy ? 2 : 1
  })

  const total = weights.reduce((sum, w) => sum + w, 0)
  let roll = rng() * total
  for (let i = 0; i < pool.length; i += 1) {
    roll -= weights[i]
    if (roll <= 0) return pool[i]
  }
  return pool[pool.length - 1]
}

let nextIncidentId = 1

/**
 * Opens a new incident at the detected stage.
 *
 * `now` is injected rather than read from the clock inside, for the same
 * reason threatEngine takes an `rng`: a rule that reaches for ambient
 * state cannot be tested without faking the world around it.
 */
export function openIncident({ caseId, title, severity, affectedSystem }, now = () => Date.now()) {
  const detectedAt = now()

  return {
    id: `incident-${nextIncidentId++}`,
    caseId,
    title,
    severity,
    affectedSystem,
    state: INCIDENT_STATE.DETECTED,
    detectedAt,
    // Every stage change is recorded as it happens. The replay and the
    // response-time metrics both read this, and capturing it at the
    // transition is the only place the information exists.
    history: [{ from: null, to: INCIDENT_STATE.DETECTED, at: detectedAt, note: 'Incident detected' }],
  }
}

/**
 * Moves an incident to a new stage.
 *
 * Returns `{ ok, incident, reason }` rather than throwing: an invalid
 * transition is a thing a UI can ask for by mistake, and the safe answer
 * is to refuse it and say why, leaving the incident untouched.
 */
export function transitionIncident(incident, to, { note = '', now = () => Date.now() } = {}) {
  const from = incident.state

  if (isTerminal(from)) {
    return { ok: false, incident, reason: `Incident is already ${from} and cannot change stage.` }
  }

  if (!canTransition(from, to)) {
    return { ok: false, incident, reason: `Cannot go from ${from} to ${to}.` }
  }

  const at = now()

  return {
    ok: true,
    reason: null,
    incident: {
      ...incident,
      state: to,
      history: [...incident.history, { from, to, at, note }],
    },
  }
}

/**
 * Escalates an incident from wherever it currently is.
 *
 * A convenience over transitionIncident because escalation is reachable
 * from every live stage, so callers should not have to check first.
 */
export function escalateIncident(incident, reason = 'Escalated', now = () => Date.now()) {
  return transitionIncident(incident, INCIDENT_STATE.ESCALATED, { note: reason, now })
}

/**
 * How long the incident has been open, and how long each stage took.
 *
 * Durations come from the history rather than being tracked separately,
 * so they cannot drift out of step with the stages that produced them.
 */
export function responseTimeline(incident) {
  const entries = incident.history
  const stages = []

  for (let i = 0; i < entries.length - 1; i += 1) {
    stages.push({
      stage: entries[i].to,
      durationMs: entries[i + 1].at - entries[i].at,
    })
  }

  const first = entries[0]
  const last = entries[entries.length - 1]

  return {
    stages,
    totalMs: last.at - first.at,
    resolved: incident.state === INCIDENT_STATE.RESOLVED,
  }
}
