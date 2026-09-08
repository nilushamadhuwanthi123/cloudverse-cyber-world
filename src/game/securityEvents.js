/**
 * The security event log.
 *
 * Everything the analytics screen shows is derived from this list, and
 * nothing else. The alternative -- keeping a running total per metric on
 * the progress object -- means a new chart needs a new counter, a new
 * migration, and a save file that cannot answer a question nobody asked
 * when it was written. One append-only log of what happened can answer
 * all of them after the fact.
 *
 * Pure module: no DOM, no localStorage, no clock of its own. The caller
 * passes `now`, so the same inputs always produce the same log and the
 * tests need no fake timers.
 *
 * Every event describes fictional, simulated activity inside CLOUDVERSE.
 */

export const EVENT_TYPE = {
  THREAT_RESPONSE: 'threat-response',
  DEFENSE_TOGGLE: 'defense-toggle',
  INCIDENT_CLOSED: 'incident-closed',
  FORENSICS_CLOSED: 'forensics-closed',
  NETWORK_DECISION: 'network-decision',
  MISSION_COMPLETED: 'mission-completed',
}

const EVENT_TYPES = Object.values(EVENT_TYPE)

/**
 * How many events are kept.
 *
 * The log lives in localStorage, which is small and shared with the rest
 * of the origin, so it cannot grow without bound. 250 is far more than
 * any chart here reads and still writes as a few kilobytes of JSON.
 * Oldest events are dropped first, so the recent picture stays exact
 * and only distant history blurs.
 */
export const MAX_EVENTS = 250

/**
 * Monotonic tie-breaker for ids.
 *
 * Two events can genuinely happen in the same millisecond -- one
 * response can complete two missions at once -- and an id built from
 * the timestamp alone then collides. React uses these as list keys, and
 * duplicate keys make it render the same row twice and drop the other,
 * which is exactly how it surfaced: a feed showing one mission's
 * completion twice and hiding another's.
 */
let sequence = 0

/**
 * Builds one event.
 *
 * `id` is injectable alongside `now` purely so tests can assert on a
 * whole log by value instead of stripping generated fields out of it.
 */
export function createEvent(type, detail = {}, { now = () => Date.now(), id } = {}) {
  const at = now()
  sequence += 1

  return {
    id: id ?? `${type}-${at}-${sequence}`,
    type,
    at,
    ...detail,
  }
}

/**
 * Appends an event, returning a new array. Never mutates the input --
 * React state holds this list and must be able to tell old from new by
 * identity.
 */
export function appendEvent(events = [], event) {
  if (!event || !EVENT_TYPES.includes(event.type)) return events
  const next = [...events, event]
  return next.length > MAX_EVENTS ? next.slice(next.length - MAX_EVENTS) : next
}

/**
 * Validates a stored log, dropping entries that no longer make sense.
 *
 * A build that renames an event type must not make the analytics screen
 * throw on a save file written before the rename -- the unknown entries
 * are simply not counted, and everything still readable is kept.
 */
export function reconcileEvents(stored) {
  if (!Array.isArray(stored)) return []

  const valid = stored.filter(
    (event) =>
      event &&
      typeof event === 'object' &&
      EVENT_TYPES.includes(event.type) &&
      typeof event.at === 'number' &&
      Number.isFinite(event.at)
  )

  const ordered = [...valid].sort((a, b) => a.at - b.at)
  return ordered.length > MAX_EVENTS ? ordered.slice(ordered.length - MAX_EVENTS) : ordered
}

/** All events of one type, oldest first. */
export function eventsOfType(events = [], type) {
  return events.filter((event) => event.type === type)
}

/* ------------------------------------------------------------------ *
 * Constructors for the four things that actually happen. Callers use
 * these rather than createEvent directly, so the shape of an event is
 * decided in one place and a typo in a detail key cannot quietly cost
 * a chart its data.
 * ------------------------------------------------------------------ */

export function threatResponseEvent(
  { severity, correct, healthAfter, scoreAfter, allDefensesOn },
  options
) {
  return createEvent(
    EVENT_TYPE.THREAT_RESPONSE,
    {
      severity,
      correct: Boolean(correct),
      healthAfter,
      scoreAfter,
      allDefensesOn: Boolean(allDefensesOn),
    },
    options
  )
}

export function defenseToggleEvent({ ruleId, on, activeCount }, options) {
  return createEvent(
    EVENT_TYPE.DEFENSE_TOGGLE,
    { ruleId, on: Boolean(on), activeCount },
    options
  )
}

export function incidentClosedEvent({ caseId, outcome, seconds }, options) {
  return createEvent(EVENT_TYPE.INCIDENT_CLOSED, { caseId, outcome, seconds }, options)
}

/**
 * A forensic case file submitted.
 *
 * Its own type rather than reusing incident-closed: a wrong conclusion
 * is not an escalation, and squeezing it into that shape would have the
 * analytics screen counting misidentified cases as cases handed to tier
 * 2. Two different things deserve two names.
 */
export function forensicsClosedEvent({ caseId, correct, chainComplete }, options) {
  return createEvent(
    EVENT_TYPE.FORENSICS_CLOSED,
    { caseId, correct: Boolean(correct), chainComplete: Boolean(chainComplete) },
    options
  )
}

/**
 * One allow-or-block decision on captured traffic.
 *
 * `malicious` records what the packet actually was, so the log can tell
 * a missed threat from a false positive after the fact. A single
 * "correct" flag could not: both are wrong, and they are wrong in
 * opposite directions.
 */
export function networkDecisionEvent({ packetId, action, malicious, correct }, options) {
  return createEvent(
    EVENT_TYPE.NETWORK_DECISION,
    { packetId, action, malicious: Boolean(malicious), correct: Boolean(correct) },
    options
  )
}

export function missionCompletedEvent({ missionId }, options) {
  return createEvent(EVENT_TYPE.MISSION_COMPLETED, { missionId }, options)
}
