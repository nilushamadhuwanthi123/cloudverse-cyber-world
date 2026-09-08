/**
 * Turning the security event log into something a person can read.
 *
 * The log stores what happened in the shape the analytics screen needs
 * -- ids, flags, numbers. A feed needs sentences. Doing that translation
 * here rather than inside the component means the wording can be
 * asserted in a test, and the same line can later be reused by a
 * notification, a post-mortem, or an export without being retyped.
 *
 * Pure module: no DOM, and no clock of its own -- each line is stamped
 * with the time the event was recorded, not with how long ago that was.
 * "3m ago" would need the current time, which means reading a clock
 * during render and re-rendering to keep it honest; a wall-clock stamp
 * is both truer to what a security feed shows and a function of the
 * event alone.
 *
 * Every event describes fictional, simulated activity inside CLOUDVERSE.
 */
import { MISSION_LIST } from '../data/missions'
import { DEFENSE_RULES } from './defenseRules'
import { EVENT_TYPE } from './securityEvents'

/**
 * Tone is advisory for styling. It is never the only carrier of meaning:
 * every line states its outcome in words as well.
 */
export const FEED_TONE = {
  GOOD: 'good',
  BAD: 'bad',
  WARN: 'warn',
  INFO: 'info',
}

const ruleLabel = (ruleId) =>
  DEFENSE_RULES.find((rule) => rule.id === ruleId)?.title ?? 'A defense rule'

const missionTitle = (missionId) =>
  MISSION_LIST.find((mission) => mission.id === missionId)?.title ?? 'A mission'

/**
 * The wall-clock time an event was recorded, as HH:MM:SS.
 *
 * Seconds are kept: two events a few seconds apart is exactly the
 * pattern a responder is looking for, and rounding them into the same
 * minute hides it.
 */
export function clockTime(at) {
  const date = new Date(at)
  if (Number.isNaN(date.getTime())) return '--:--:--'

  const pad = (value) => String(value).padStart(2, '0')
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

/**
 * One event as a headline and a detail line.
 *
 * Returns null for an event type this build does not know how to
 * describe, so a log written by a later build degrades to fewer lines
 * rather than to a row reading "undefined".
 */
export function describeEvent(event) {
  if (!event || typeof event !== 'object') return null

  switch (event.type) {
    case EVENT_TYPE.THREAT_RESPONSE: {
      const severity = event.severity ? String(event.severity).toUpperCase() : 'UNKNOWN'
      return {
        id: event.id,
        at: event.at,
        tone: event.correct ? FEED_TONE.GOOD : FEED_TONE.BAD,
        tag: severity,
        headline: event.correct ? 'Threat contained' : 'Threat escalated',
        detail: event.correct
          ? `Correct response to a ${severity.toLowerCase()} threat. World health ${event.healthAfter ?? '—'}.`
          : `Wrong response to a ${severity.toLowerCase()} threat. World health ${event.healthAfter ?? '—'}.`,
      }
    }

    case EVENT_TYPE.DEFENSE_TOGGLE:
      return {
        id: event.id,
        at: event.at,
        tone: event.on ? FEED_TONE.GOOD : FEED_TONE.WARN,
        tag: 'DEFENSE',
        headline: event.on ? 'Defense rule enabled' : 'Defense rule disabled',
        detail: `${ruleLabel(event.ruleId)} — ${event.activeCount ?? '—'} of ${DEFENSE_RULES.length} rules now active.`,
      }

    case EVENT_TYPE.INCIDENT_CLOSED:
      return {
        id: event.id,
        at: event.at,
        // An escalation is a legitimate call, not a failure, so it reads
        // as a warning rather than as something that went wrong.
        tone: event.outcome === 'resolved' ? FEED_TONE.GOOD : FEED_TONE.WARN,
        tag: event.caseId ?? 'INCIDENT',
        headline: event.outcome === 'resolved' ? 'Investigation resolved' : 'Investigation escalated',
        detail:
          event.outcome === 'resolved'
            ? `Case closed${typeof event.seconds === 'number' ? ` after ${event.seconds}s` : ''}.`
            : `Handed to tier 2${typeof event.seconds === 'number' ? ` after ${event.seconds}s` : ''}.`,
      }

    case EVENT_TYPE.FORENSICS_CLOSED:
      return {
        id: event.id,
        at: event.at,
        tone: event.correct ? FEED_TONE.GOOD : FEED_TONE.BAD,
        tag: event.caseId ?? 'FORENSICS',
        headline: event.correct ? 'Case file closed' : 'Case file misidentified',
        detail: event.correct
          ? `Conclusion supported by the evidence${event.chainComplete ? ', whole chain traced' : ', chain left incomplete'}.`
          : `Conclusion not supported by the evidence${event.chainComplete ? ', despite the whole chain being traced' : '; the chain was left incomplete'}.`,
      }

    case EVENT_TYPE.MISSION_COMPLETED:
      return {
        id: event.id,
        at: event.at,
        tone: FEED_TONE.INFO,
        tag: 'MISSION',
        headline: 'Mission complete',
        detail: `${missionTitle(event.missionId)} finished.`,
      }

    default:
      return null
  }
}

/**
 * The most recent events, newest first, described.
 *
 * The log is stored oldest-first because that is the order things
 * happened in and the order the charts plot. A feed is read the other
 * way round, so the reversal lives here rather than being repeated at
 * every call site.
 */
export function buildFeed(events = [], { limit = 12 } = {}) {
  const described = []

  for (let i = events.length - 1; i >= 0 && described.length < limit; i -= 1) {
    const line = describeEvent(events[i])
    if (line) described.push({ ...line, when: clockTime(line.at) })
  }

  return described
}
