/**
 * Analytics over the security event log.
 *
 * Every function here takes the log and returns a reading. Nothing is
 * cached, nothing is stored, and nothing is counted twice: the log is
 * the only state, so a number on the analytics screen can always be
 * traced back to the events that produced it. That is the whole reason
 * the log exists instead of a pile of running totals.
 *
 * Pure module -- no DOM, no clock, no storage. Same log in, same
 * numbers out, which is what makes these testable as plain functions.
 */
import { EVENT_TYPE, eventsOfType } from './securityEvents'

export const SEVERITY_ORDER = ['low', 'medium', 'high', 'critical']

/** Whole-number percentage, guarding the empty case rather than NaN. */
function percentage(part, whole) {
  if (!whole) return 0
  return Math.round((part / whole) * 100)
}

/**
 * Totals across every threat response in the log.
 *
 * `accuracy` is deliberately 0 rather than null when nothing has been
 * answered yet -- an empty analytics screen should read "0% of 0", not
 * refuse to render.
 */
export function responseTotals(events = []) {
  const responses = eventsOfType(events, EVENT_TYPE.THREAT_RESPONSE)
  const correct = responses.filter((event) => event.correct).length

  return {
    total: responses.length,
    correct,
    wrong: responses.length - correct,
    accuracy: percentage(correct, responses.length),
  }
}

/**
 * Accuracy split by how severe the threat was.
 *
 * Always returns all four severities, including ones never seen, so the
 * chart has a stable set of bars instead of rearranging itself as the
 * player meets new threat types.
 */
export function accuracyBySeverity(events = []) {
  const responses = eventsOfType(events, EVENT_TYPE.THREAT_RESPONSE)

  return SEVERITY_ORDER.map((severity) => {
    const forSeverity = responses.filter((event) => event.severity === severity)
    const correct = forSeverity.filter((event) => event.correct).length

    return {
      severity,
      total: forSeverity.length,
      correct,
      accuracy: percentage(correct, forSeverity.length),
    }
  })
}

/**
 * Current and best run of consecutive correct responses.
 *
 * Recomputed from the log rather than read off the progress object, so
 * it stays honest even if a counter elsewhere drifts.
 */
export function streaks(events = []) {
  const responses = eventsOfType(events, EVENT_TYPE.THREAT_RESPONSE)

  let current = 0
  let best = 0
  for (const event of responses) {
    current = event.correct ? current + 1 : 0
    if (current > best) best = current
  }

  return { current, best }
}

/**
 * A numeric field of the response events as an ordered series.
 *
 * Entries where the field is missing are skipped rather than plotted as
 * zero -- a gap in the record is not a drop to nothing, and drawing it
 * as one would invent a cliff that never happened.
 */
export function seriesOf(events = [], field) {
  return eventsOfType(events, EVENT_TYPE.THREAT_RESPONSE)
    .filter((event) => typeof event[field] === 'number' && Number.isFinite(event[field]))
    .map((event, index) => ({ index, at: event.at, value: event[field] }))
}

/** World health after each response. */
export function healthSeries(events = []) {
  return seriesOf(events, 'healthAfter')
}

/** Security score after each response. */
export function scoreSeries(events = []) {
  return seriesOf(events, 'scoreAfter')
}

/**
 * How investigations ended, and how long they took.
 *
 * `meanSeconds` counts only closures that recorded a duration, so an
 * incident closed by an older build without one lowers neither the
 * average nor the count it is averaged over.
 */
export function incidentOutcomes(events = []) {
  const closed = eventsOfType(events, EVENT_TYPE.INCIDENT_CLOSED)
  const resolved = closed.filter((event) => event.outcome === 'resolved').length
  const escalated = closed.filter((event) => event.outcome === 'escalated').length

  const timed = closed.filter(
    (event) => typeof event.seconds === 'number' && Number.isFinite(event.seconds)
  )
  const meanSeconds = timed.length
    ? Math.round(timed.reduce((sum, event) => sum + event.seconds, 0) / timed.length)
    : null

  return {
    total: closed.length,
    resolved,
    escalated,
    resolutionRate: percentage(resolved, closed.length),
    meanSeconds,
  }
}

/**
 * What the player did to their own defenses.
 *
 * `lowestActiveCount` is the interesting one: it answers "how exposed
 * did this run ever get", which no running total on the progress object
 * could reconstruct after the fact.
 */
export function defenseActivity(events = []) {
  const toggles = eventsOfType(events, EVENT_TYPE.DEFENSE_TOGGLE)
  const counts = toggles
    .map((event) => event.activeCount)
    .filter((count) => typeof count === 'number' && Number.isFinite(count))

  return {
    toggles: toggles.length,
    turnedOff: toggles.filter((event) => !event.on).length,
    lowestActiveCount: counts.length ? Math.min(...counts) : null,
  }
}

/** Responses answered while every defense rule was on. */
export function responsesUnderFullDefense(events = []) {
  return eventsOfType(events, EVENT_TYPE.THREAT_RESPONSE).filter(
    (event) => event.allDefensesOn && event.correct
  ).length
}

/**
 * Everything the analytics screen needs, in one pass over the log.
 *
 * The screen calls this once and reads fields off the result, rather
 * than calling six functions and filtering the same array six times in
 * render.
 */
export function analyzeSecurity(events = []) {
  return {
    eventCount: events.length,
    responses: responseTotals(events),
    bySeverity: accuracyBySeverity(events),
    streaks: streaks(events),
    health: healthSeries(events),
    score: scoreSeries(events),
    incidents: incidentOutcomes(events),
    defenses: defenseActivity(events),
    fullDefenseWins: responsesUnderFullDefense(events),
    missionsCompleted: eventsOfType(events, EVENT_TYPE.MISSION_COMPLETED).length,
  }
}
