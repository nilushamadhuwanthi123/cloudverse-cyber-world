/**
 * Correlating an indicator to what is known about it.
 *
 * The chain this sector exists to walk:
 *
 *   indicator -> actor -> campaign -> patterns -> a case in this run
 *
 * Every link is derived from shared indicator strings, the same way the
 * forensics board derives its connections. Nothing is authored as an
 * edge, so the intelligence cannot claim a relationship the data does
 * not support.
 *
 * The last link is what stops this being an encyclopaedia: a sighting is
 * an indicator *this player flagged in their own investigation*, read
 * back out of the security event log. An indicator nobody has seen is
 * shown as exactly that, rather than being quietly dressed up as
 * evidence.
 *
 * Pure module: no DOM, no storage, no clock.
 */
import { ATTACK_PATTERNS, CAMPAIGNS, KNOWN_INDICATORS, THREAT_ACTORS } from '../data/threatIntel'
import { EVENT_TYPE, eventsOfType } from './securityEvents'

/** The actors that list this indicator. */
export function actorsFor(indicator) {
  if (!indicator) return []
  return THREAT_ACTORS.filter((actor) => actor.indicators.includes(indicator))
}

/** The campaigns that list this indicator. */
export function campaignsFor(indicator) {
  if (!indicator) return []
  return CAMPAIGNS.filter((campaign) => campaign.indicators.includes(indicator))
}

/** An actor's patterns, resolved from ids to the patterns themselves. */
export function patternsForActor(actor) {
  if (!actor) return []
  return actor.patternIds
    .map((id) => ATTACK_PATTERNS.find((pattern) => pattern.id === id))
    .filter(Boolean)
}

/** One actor by id. */
export function findActor(id) {
  return THREAT_ACTORS.find((actor) => actor.id === id) ?? null
}

/**
 * The whole chain for one indicator.
 *
 * Returns empty collections rather than null for an indicator nothing is
 * known about, so the screen can say "nothing known" instead of
 * crashing on a missing branch.
 */
export function correlate(indicator) {
  const actors = actorsFor(indicator)
  const campaigns = campaignsFor(indicator)
  const patterns = [
    ...new Map(
      actors.flatMap((actor) => patternsForActor(actor)).map((pattern) => [pattern.id, pattern])
    ).values(),
  ]

  return {
    indicator,
    actors,
    campaigns,
    patterns,
    known: actors.length > 0 || campaigns.length > 0,
  }
}

/**
 * The indicators this player actually flagged, and the case they came
 * from.
 *
 * Read from the security event log rather than tracked separately: the
 * log already records every closed forensic case, so adding a parallel
 * store of "things seen" would be a second source of truth for a fact
 * that is already written down.
 */
export function sightingsFromEvents(events = []) {
  const sightings = new Map()

  for (const event of eventsOfType(events, EVENT_TYPE.FORENSICS_CLOSED)) {
    for (const indicator of event.indicators ?? []) {
      if (!sightings.has(indicator)) sightings.set(indicator, [])
      if (event.caseId && !sightings.get(indicator).includes(event.caseId)) {
        sightings.get(indicator).push(event.caseId)
      }
    }
  }

  return sightings
}

/**
 * Every indicator the sector can show, marked with whether this run has
 * seen it.
 *
 * Indicators flagged in a case but unknown to intelligence are included
 * too. "You found something we have nothing on" is a real and useful
 * state, and dropping those would quietly tell the player their find did
 * not count.
 */
export function indicatorBoard(events = []) {
  const sightings = sightingsFromEvents(events)
  const all = [...new Set([...KNOWN_INDICATORS, ...sightings.keys()])]

  return all
    .map((indicator) => ({
      indicator,
      seen: sightings.has(indicator),
      caseIds: sightings.get(indicator) ?? [],
      known: correlate(indicator).known,
    }))
    .sort((a, b) => {
      // What the player found comes first: it is the part of this screen
      // that is about them rather than about the catalogue.
      if (a.seen !== b.seen) return a.seen ? -1 : 1
      return a.indicator.localeCompare(b.indicator)
    })
}

/** Splits `ip:198.51.100.23` into its kind and value, for display. */
export function readIndicator(indicator) {
  const separator = String(indicator ?? '').indexOf(':')
  if (separator === -1) return { kind: 'indicator', value: String(indicator ?? '') }

  return {
    kind: indicator.slice(0, separator),
    value: indicator.slice(separator + 1),
  }
}
