import { describe, expect, it } from 'vitest'
import {
  INCIDENT_STATE,
  canTransition,
  escalateIncident,
  isTerminal,
  nextStates,
  openIncident,
  responseTimeline,
  transitionIncident,
} from './incidentResponse'

const CASE = {
  caseId: 'CV-001',
  title: 'Suspicious Login Burst',
  severity: 'high',
  affectedSystem: 'auth-gateway',
}

/** A clock that advances a fixed step each read, so durations are predictable. */
function fakeClock(startMs = 1000, stepMs = 60000) {
  let t = startMs - stepMs
  return () => {
    t += stepMs
    return t
  }
}

/** Walks an incident through the full happy path and returns it. */
function walkToResolved(incident, now) {
  const order = [
    INCIDENT_STATE.INVESTIGATING,
    INCIDENT_STATE.CONTAINED,
    INCIDENT_STATE.ERADICATION,
    INCIDENT_STATE.RECOVERY,
    INCIDENT_STATE.VERIFICATION,
    INCIDENT_STATE.RESOLVED,
  ]
  return order.reduce((current, stage) => {
    const result = transitionIncident(current, stage, { now })
    expect(result.ok).toBe(true)
    return result.incident
  }, incident)
}

describe('openIncident', () => {
  it('starts at detected with the case details attached', () => {
    const incident = openIncident(CASE, fakeClock())

    expect(incident.state).toBe(INCIDENT_STATE.DETECTED)
    expect(incident.caseId).toBe('CV-001')
    expect(incident.affectedSystem).toBe('auth-gateway')
  })

  it('records the detection as the first history entry', () => {
    const incident = openIncident(CASE, fakeClock())

    expect(incident.history).toHaveLength(1)
    expect(incident.history[0]).toMatchObject({ from: null, to: INCIDENT_STATE.DETECTED })
  })

  it('gives each incident a distinct id', () => {
    expect(openIncident(CASE).id).not.toBe(openIncident(CASE).id)
  })
})

describe('canTransition', () => {
  it('allows the response phases in order', () => {
    expect(canTransition(INCIDENT_STATE.DETECTED, INCIDENT_STATE.INVESTIGATING)).toBe(true)
    expect(canTransition(INCIDENT_STATE.INVESTIGATING, INCIDENT_STATE.CONTAINED)).toBe(true)
    expect(canTransition(INCIDENT_STATE.CONTAINED, INCIDENT_STATE.ERADICATION)).toBe(true)
    expect(canTransition(INCIDENT_STATE.ERADICATION, INCIDENT_STATE.RECOVERY)).toBe(true)
    expect(canTransition(INCIDENT_STATE.RECOVERY, INCIDENT_STATE.VERIFICATION)).toBe(true)
    expect(canTransition(INCIDENT_STATE.VERIFICATION, INCIDENT_STATE.RESOLVED)).toBe(true)
  })

  it('refuses to skip a phase', () => {
    expect(canTransition(INCIDENT_STATE.DETECTED, INCIDENT_STATE.RESOLVED)).toBe(false)
    expect(canTransition(INCIDENT_STATE.DETECTED, INCIDENT_STATE.CONTAINED)).toBe(false)
    expect(canTransition(INCIDENT_STATE.INVESTIGATING, INCIDENT_STATE.RECOVERY)).toBe(false)
  })

  it('refuses to run the response backwards', () => {
    expect(canTransition(INCIDENT_STATE.CONTAINED, INCIDENT_STATE.INVESTIGATING)).toBe(false)
    expect(canTransition(INCIDENT_STATE.RECOVERY, INCIDENT_STATE.CONTAINED)).toBe(false)
  })

  it('lets verification send the incident back when the fix did not hold', () => {
    expect(canTransition(INCIDENT_STATE.VERIFICATION, INCIDENT_STATE.ERADICATION)).toBe(true)
  })

  it('allows escalation from every live phase', () => {
    for (const state of [
      INCIDENT_STATE.DETECTED,
      INCIDENT_STATE.INVESTIGATING,
      INCIDENT_STATE.CONTAINED,
      INCIDENT_STATE.ERADICATION,
      INCIDENT_STATE.RECOVERY,
      INCIDENT_STATE.VERIFICATION,
    ]) {
      expect(canTransition(state, INCIDENT_STATE.ESCALATED)).toBe(true)
    }
  })

  it('treats an unknown stage as not allowed rather than throwing', () => {
    expect(canTransition('not-a-stage', INCIDENT_STATE.RESOLVED)).toBe(false)
    expect(canTransition(INCIDENT_STATE.DETECTED, 'not-a-stage')).toBe(false)
  })
})

describe('isTerminal / nextStates', () => {
  it('marks resolved and escalated as terminal', () => {
    expect(isTerminal(INCIDENT_STATE.RESOLVED)).toBe(true)
    expect(isTerminal(INCIDENT_STATE.ESCALATED)).toBe(true)
  })

  it('does not mark a live phase as terminal', () => {
    expect(isTerminal(INCIDENT_STATE.DETECTED)).toBe(false)
    expect(isTerminal(INCIDENT_STATE.VERIFICATION)).toBe(false)
  })

  it('offers only the reachable stages', () => {
    expect(nextStates(INCIDENT_STATE.DETECTED)).toEqual([
      INCIDENT_STATE.INVESTIGATING,
      INCIDENT_STATE.ESCALATED,
    ])
    expect(nextStates(INCIDENT_STATE.RESOLVED)).toEqual([])
  })

  it('returns a copy, so a caller cannot edit the transition rules', () => {
    const states = nextStates(INCIDENT_STATE.DETECTED)
    states.push('tampered')
    expect(nextStates(INCIDENT_STATE.DETECTED)).not.toContain('tampered')
  })
})

describe('transitionIncident', () => {
  it('advances a valid transition and records it', () => {
    const incident = openIncident(CASE, fakeClock())
    const { ok, incident: next } = transitionIncident(incident, INCIDENT_STATE.INVESTIGATING, {
      note: 'Analyst assigned',
      now: fakeClock(120000),
    })

    expect(ok).toBe(true)
    expect(next.state).toBe(INCIDENT_STATE.INVESTIGATING)
    expect(next.history).toHaveLength(2)
    expect(next.history[1]).toMatchObject({
      from: INCIDENT_STATE.DETECTED,
      to: INCIDENT_STATE.INVESTIGATING,
      note: 'Analyst assigned',
    })
  })

  it('refuses an invalid transition and says why, leaving the incident untouched', () => {
    const incident = openIncident(CASE, fakeClock())
    const result = transitionIncident(incident, INCIDENT_STATE.RESOLVED)

    expect(result.ok).toBe(false)
    expect(result.reason).toContain('Cannot go from detected to resolved')
    expect(result.incident).toBe(incident)
  })

  it('refuses to change a terminal incident', () => {
    const now = fakeClock()
    const resolved = walkToResolved(openIncident(CASE, now), now)
    const result = transitionIncident(resolved, INCIDENT_STATE.INVESTIGATING)

    expect(result.ok).toBe(false)
    expect(result.reason).toContain('already resolved')
  })

  it('never mutates the incident it is given', () => {
    const incident = openIncident(CASE, fakeClock())
    const before = JSON.parse(JSON.stringify(incident))

    transitionIncident(incident, INCIDENT_STATE.INVESTIGATING)

    expect(JSON.parse(JSON.stringify(incident))).toEqual(before)
  })

  it('walks the full response path to resolved', () => {
    const now = fakeClock()
    const resolved = walkToResolved(openIncident(CASE, now), now)

    expect(resolved.state).toBe(INCIDENT_STATE.RESOLVED)
    expect(resolved.history.map((h) => h.to)).toEqual([
      INCIDENT_STATE.DETECTED,
      INCIDENT_STATE.INVESTIGATING,
      INCIDENT_STATE.CONTAINED,
      INCIDENT_STATE.ERADICATION,
      INCIDENT_STATE.RECOVERY,
      INCIDENT_STATE.VERIFICATION,
      INCIDENT_STATE.RESOLVED,
    ])
  })

  it('supports a failed verification looping back to eradication', () => {
    const now = fakeClock()
    let incident = openIncident(CASE, now)
    for (const stage of [
      INCIDENT_STATE.INVESTIGATING,
      INCIDENT_STATE.CONTAINED,
      INCIDENT_STATE.ERADICATION,
      INCIDENT_STATE.RECOVERY,
      INCIDENT_STATE.VERIFICATION,
    ]) {
      incident = transitionIncident(incident, stage, { now }).incident
    }

    const retry = transitionIncident(incident, INCIDENT_STATE.ERADICATION, {
      note: 'Verification failed',
      now,
    })

    expect(retry.ok).toBe(true)
    expect(retry.incident.state).toBe(INCIDENT_STATE.ERADICATION)
  })
})

describe('escalateIncident', () => {
  it('escalates from any live phase and keeps the reason', () => {
    const incident = openIncident(CASE, fakeClock())
    const { ok, incident: escalated } = escalateIncident(incident, 'Response window expired')

    expect(ok).toBe(true)
    expect(escalated.state).toBe(INCIDENT_STATE.ESCALATED)
    expect(escalated.history.at(-1).note).toBe('Response window expired')
  })

  it('will not escalate an already-resolved incident', () => {
    const now = fakeClock()
    const resolved = walkToResolved(openIncident(CASE, now), now)

    expect(escalateIncident(resolved).ok).toBe(false)
  })
})

describe('responseTimeline', () => {
  it('reports how long each phase took and the total', () => {
    const now = fakeClock(0, 60000) // one minute per step
    const resolved = walkToResolved(openIncident(CASE, now), now)
    const timeline = responseTimeline(resolved)

    expect(timeline.resolved).toBe(true)
    expect(timeline.totalMs).toBe(6 * 60000)
    expect(timeline.stages).toHaveLength(6)
    expect(timeline.stages[0]).toEqual({ stage: INCIDENT_STATE.DETECTED, durationMs: 60000 })
  })

  it('reports an unresolved incident as not resolved', () => {
    const incident = openIncident(CASE, fakeClock())
    expect(responseTimeline(incident).resolved).toBe(false)
    expect(responseTimeline(incident).stages).toEqual([])
  })
})
