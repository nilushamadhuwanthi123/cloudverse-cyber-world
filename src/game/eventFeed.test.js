import { describe, expect, it } from 'vitest'
import { FEED_TONE, buildFeed, clockTime, describeEvent } from './eventFeed'
import {
  defenseToggleEvent,
  incidentClosedEvent,
  missionCompletedEvent,
  threatResponseEvent,
} from './securityEvents'

const at = (ms) => ({ now: () => ms, id: `e-${ms}` })

describe('clockTime', () => {
  // A wall-clock stamp is a function of the event alone. "3m ago" would
  // need the current time, which means reading a clock during render.
  it('stamps the recorded time, seconds included', () => {
    const stamp = clockTime(new Date(2026, 8, 8, 14, 5, 9).getTime())
    expect(stamp).toBe('14:05:09')
  })

  // Two events seconds apart is exactly the pattern a responder looks
  // for; rounding them into one minute would hide it.
  it('keeps two events seconds apart distinguishable', () => {
    const base = new Date(2026, 8, 8, 14, 5, 9).getTime()
    expect(clockTime(base)).not.toBe(clockTime(base + 3000))
  })

  it('degrades to placeholders rather than Invalid Date', () => {
    expect(clockTime(Number.NaN)).toBe('--:--:--')
    expect(clockTime(undefined)).toBe('--:--:--')
  })
})

describe('describeEvent', () => {
  it('says which way a threat response went, in words', () => {
    const win = describeEvent(threatResponseEvent({ severity: 'high', correct: true, healthAfter: 95 }, at(1)))
    const loss = describeEvent(threatResponseEvent({ severity: 'high', correct: false, healthAfter: 85 }, at(2)))

    expect(win).toMatchObject({ tone: FEED_TONE.GOOD, tag: 'HIGH', headline: 'Threat contained' })
    expect(win.detail).toContain('World health 95')
    expect(loss).toMatchObject({ tone: FEED_TONE.BAD, headline: 'Threat escalated' })
  })

  it('names the defense rule rather than echoing its id', () => {
    const line = describeEvent(
      defenseToggleEvent({ ruleId: 'rate-limiting', on: false, activeCount: 3 }, at(3))
    )

    expect(line.headline).toBe('Defense rule disabled')
    expect(line.detail).toContain('Rate Limiting')
    expect(line.detail).toContain('3 of 4 rules now active')
    expect(line.tone).toBe(FEED_TONE.WARN)
  })

  // Escalating a case you cannot finish is the correct call often enough
  // that the feed must not colour it as a failure.
  it('treats an escalated investigation as a warning, not a loss', () => {
    const resolved = describeEvent(incidentClosedEvent({ caseId: 'CV-001', outcome: 'resolved', seconds: 40 }, at(4)))
    const escalated = describeEvent(incidentClosedEvent({ caseId: 'CV-002', outcome: 'escalated', seconds: 12 }, at(5)))

    expect(resolved.tone).toBe(FEED_TONE.GOOD)
    expect(resolved.detail).toContain('after 40s')
    expect(escalated.tone).toBe(FEED_TONE.WARN)
    expect(escalated.headline).toBe('Investigation escalated')
    expect(escalated.tag).toBe('CV-002')
  })

  it('resolves a mission id to its title', () => {
    const line = describeEvent(missionCompletedEvent({ missionId: 'first-response' }, at(6)))
    expect(line.detail).toContain('First Response')
  })

  // A log written by a later build should cost the feed a line, not a
  // row reading "undefined".
  it('returns nothing for an event this build cannot describe', () => {
    expect(describeEvent({ type: 'something-later', at: 1 })).toBeNull()
    expect(describeEvent(null)).toBeNull()
    expect(describeEvent('nope')).toBeNull()
  })

  it('does not print undefined when a field is missing', () => {
    const line = describeEvent(threatResponseEvent({ correct: true }, at(7)))
    expect(line.detail).not.toContain('undefined')
    expect(line.tag).toBe('UNKNOWN')
  })
})

describe('buildFeed', () => {
  const log = [
    threatResponseEvent({ severity: 'low', correct: true, healthAfter: 100 }, at(1000)),
    defenseToggleEvent({ ruleId: 'rate-limiting', on: false, activeCount: 3 }, at(2000)),
    missionCompletedEvent({ missionId: 'first-response' }, at(3000)),
  ]

  // The log is stored oldest-first because that is the order the charts
  // plot. A feed is read the other way round.
  it('reverses the log so the newest line is first', () => {
    const feed = buildFeed(log)
    expect(feed.map((line) => line.headline)).toEqual([
      'Mission complete',
      'Defense rule disabled',
      'Threat contained',
    ])
  })

  it('honours the limit, keeping the newest entries', () => {
    const feed = buildFeed(log, { limit: 2 })
    expect(feed).toHaveLength(2)
    expect(feed[0].headline).toBe('Mission complete')
  })

  it('stamps each line with the time it was recorded', () => {
    const feed = buildFeed(log)
    expect(feed[0].when).toMatch(/^\d{2}:\d{2}:\d{2}$/)
  })

  it('is empty for an empty log rather than throwing', () => {
    expect(buildFeed([])).toEqual([])
    expect(buildFeed(undefined)).toEqual([])
  })

  it('skips undescribable entries without shortening the visible feed', () => {
    const mixed = [log[0], { type: 'later-build', at: 1500 }, log[1]]
    const feed = buildFeed(mixed, { limit: 2 })

    expect(feed).toHaveLength(2)
    expect(feed.map((line) => line.headline)).toEqual(['Defense rule disabled', 'Threat contained'])
  })
})
