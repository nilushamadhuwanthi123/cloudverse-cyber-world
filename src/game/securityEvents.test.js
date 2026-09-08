import { describe, expect, it } from 'vitest'
import {
  EVENT_TYPE,
  MAX_EVENTS,
  appendEvent,
  createEvent,
  defenseToggleEvent,
  eventsOfType,
  incidentClosedEvent,
  missionCompletedEvent,
  reconcileEvents,
  threatResponseEvent,
} from './securityEvents'

const at = (ms) => ({ now: () => ms, id: `e-${ms}` })

describe('createEvent', () => {
  it('stamps the time the caller supplies rather than reading a clock', () => {
    const event = createEvent(EVENT_TYPE.THREAT_RESPONSE, { severity: 'low' }, at(1000))
    expect(event).toEqual({ id: 'e-1000', type: EVENT_TYPE.THREAT_RESPONSE, at: 1000, severity: 'low' })
  })
})

describe('event ids', () => {
  // One response can complete two missions at once, so two events in the
  // same millisecond is normal. React uses these as list keys: a
  // collision makes it render one row twice and drop the other, which is
  // how this surfaced -- a feed showing one mission twice and hiding
  // another.
  it('are unique for events created in the same millisecond', () => {
    const frozen = { now: () => 1000 }
    const ids = new Set([
      missionCompletedEvent({ missionId: 'a' }, frozen).id,
      missionCompletedEvent({ missionId: 'b' }, frozen).id,
      threatResponseEvent({ severity: 'low', correct: true }, frozen).id,
    ])

    expect(ids.size).toBe(3)
  })

  it('still carry the timestamp they were given', () => {
    expect(missionCompletedEvent({ missionId: 'a' }, { now: () => 4242 }).at).toBe(4242)
  })
})

describe('appendEvent', () => {
  it('returns a new array and leaves the original alone', () => {
    const first = [threatResponseEvent({ severity: 'low', correct: true }, at(1))]
    const second = appendEvent(first, threatResponseEvent({ severity: 'high', correct: false }, at(2)))

    expect(second).toHaveLength(2)
    expect(first).toHaveLength(1)
    expect(second).not.toBe(first)
  })

  it('refuses an event whose type is not one this app records', () => {
    const log = [threatResponseEvent({ severity: 'low', correct: true }, at(1))]
    expect(appendEvent(log, { type: 'something-else', at: 2 })).toBe(log)
    expect(appendEvent(log, null)).toBe(log)
  })

  it('drops the oldest events once the cap is reached', () => {
    let log = []
    for (let i = 0; i < MAX_EVENTS + 10; i += 1) {
      log = appendEvent(log, threatResponseEvent({ severity: 'low', correct: true }, at(i)))
    }

    expect(log).toHaveLength(MAX_EVENTS)
    expect(log[0].at).toBe(10)
    expect(log[log.length - 1].at).toBe(MAX_EVENTS + 9)
  })
})

describe('reconcileEvents', () => {
  it('keeps what is still readable and drops what is not', () => {
    const good = threatResponseEvent({ severity: 'low', correct: true }, at(2))
    const stored = [good, { type: 'renamed-away', at: 1 }, { type: EVENT_TYPE.THREAT_RESPONSE }, null, 'nope']

    expect(reconcileEvents(stored)).toEqual([good])
  })

  it('orders by time, so a log written out of order still plots correctly', () => {
    const later = missionCompletedEvent({ missionId: 'b' }, at(50))
    const earlier = missionCompletedEvent({ missionId: 'a' }, at(10))

    expect(reconcileEvents([later, earlier]).map((event) => event.missionId)).toEqual(['a', 'b'])
  })

  it('returns an empty log for anything that is not an array', () => {
    expect(reconcileEvents(undefined)).toEqual([])
    expect(reconcileEvents({ nope: true })).toEqual([])
  })
})

describe('event constructors', () => {
  it('coerce the flags they are given, so a missing one is never undefined', () => {
    const response = threatResponseEvent({ severity: 'high' }, at(1))
    expect(response.correct).toBe(false)
    expect(response.allDefensesOn).toBe(false)

    expect(defenseToggleEvent({ ruleId: 'rate-limiting' }, at(2)).on).toBe(false)
  })

  it('carry the fields the analytics screen reads', () => {
    const closed = incidentClosedEvent({ caseId: 'CV-001', outcome: 'escalated', seconds: 12 }, at(3))
    expect(closed).toMatchObject({ type: EVENT_TYPE.INCIDENT_CLOSED, caseId: 'CV-001', outcome: 'escalated', seconds: 12 })
  })
})

describe('eventsOfType', () => {
  it('filters without disturbing order', () => {
    const log = [
      threatResponseEvent({ severity: 'low', correct: true }, at(1)),
      defenseToggleEvent({ ruleId: 'rate-limiting', on: false, activeCount: 3 }, at(2)),
      threatResponseEvent({ severity: 'high', correct: false }, at(3)),
    ]

    expect(eventsOfType(log, EVENT_TYPE.THREAT_RESPONSE).map((e) => e.at)).toEqual([1, 3])
  })
})
