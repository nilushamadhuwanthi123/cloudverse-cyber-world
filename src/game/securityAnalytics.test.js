import { describe, expect, it } from 'vitest'
import {
  accuracyBySeverity,
  analyzeSecurity,
  defenseActivity,
  healthSeries,
  incidentOutcomes,
  responseTotals,
  responsesUnderFullDefense,
  scoreSeries,
  streaks,
} from './securityAnalytics'
import {
  defenseToggleEvent,
  incidentClosedEvent,
  missionCompletedEvent,
  threatResponseEvent,
} from './securityEvents'

let clock = 0
const next = () => {
  clock += 1000
  return { now: () => clock, id: `e-${clock}` }
}

function response({ severity = 'low', correct = true, healthAfter, scoreAfter, allDefensesOn = true }) {
  return threatResponseEvent({ severity, correct, healthAfter, scoreAfter, allDefensesOn }, next())
}

describe('responseTotals', () => {
  it('reads an empty log as zero rather than NaN', () => {
    expect(responseTotals([])).toEqual({ total: 0, correct: 0, wrong: 0, accuracy: 0 })
  })

  it('counts only threat responses, not every event in the log', () => {
    const log = [
      response({ correct: true }),
      defenseToggleEvent({ ruleId: 'rate-limiting', on: false, activeCount: 3 }, next()),
      missionCompletedEvent({ missionId: 'first-response' }, next()),
      response({ correct: false }),
    ]

    expect(responseTotals(log)).toEqual({ total: 2, correct: 1, wrong: 1, accuracy: 50 })
  })
})

describe('accuracyBySeverity', () => {
  it('always returns all four severities, including ones never met', () => {
    const rows = accuracyBySeverity([])
    expect(rows.map((row) => row.severity)).toEqual(['low', 'medium', 'high', 'critical'])
    expect(rows.every((row) => row.total === 0 && row.accuracy === 0)).toBe(true)
  })

  it('splits accuracy by how hard the threat was', () => {
    const log = [
      response({ severity: 'low', correct: true }),
      response({ severity: 'low', correct: true }),
      response({ severity: 'critical', correct: false }),
      response({ severity: 'critical', correct: false }),
      response({ severity: 'critical', correct: true }),
    ]

    const rows = accuracyBySeverity(log)
    expect(rows.find((row) => row.severity === 'low')).toMatchObject({ total: 2, correct: 2, accuracy: 100 })
    expect(rows.find((row) => row.severity === 'critical')).toMatchObject({ total: 3, correct: 1, accuracy: 33 })
  })
})

describe('streaks', () => {
  it('recomputes both from the log rather than trusting a stored counter', () => {
    const log = [
      response({ correct: true }),
      response({ correct: true }),
      response({ correct: true }),
      response({ correct: false }),
      response({ correct: true }),
    ]

    expect(streaks(log)).toEqual({ current: 1, best: 3 })
  })

  it('is zero on both counts for an empty log', () => {
    expect(streaks([])).toEqual({ current: 0, best: 0 })
  })
})

describe('series', () => {
  it('plots each recorded reading in order', () => {
    const log = [
      response({ healthAfter: 100, scoreAfter: 10 }),
      response({ healthAfter: 90, scoreAfter: 5 }),
      response({ healthAfter: 95, scoreAfter: 17 }),
    ]

    expect(healthSeries(log).map((point) => point.value)).toEqual([100, 90, 95])
    expect(scoreSeries(log).map((point) => point.value)).toEqual([10, 5, 17])
  })

  // A response recorded by an older build carries no healthAfter. Plotting
  // that as 0 would draw a crash to zero that never happened.
  it('skips a reading the log never captured instead of plotting it as zero', () => {
    const log = [response({ healthAfter: 100 }), response({}), response({ healthAfter: 90 })]
    expect(healthSeries(log).map((point) => point.value)).toEqual([100, 90])
  })
})

describe('incidentOutcomes', () => {
  it('separates resolved from escalated and averages only what was timed', () => {
    const log = [
      incidentClosedEvent({ caseId: 'CV-001', outcome: 'resolved', seconds: 20 }, next()),
      incidentClosedEvent({ caseId: 'CV-002', outcome: 'resolved', seconds: 40 }, next()),
      incidentClosedEvent({ caseId: 'CV-003', outcome: 'escalated' }, next()),
    ]

    expect(incidentOutcomes(log)).toEqual({
      total: 3,
      resolved: 2,
      escalated: 1,
      resolutionRate: 67,
      meanSeconds: 30,
    })
  })

  it('reports no mean rather than zero when nothing was timed', () => {
    const log = [incidentClosedEvent({ caseId: 'CV-001', outcome: 'resolved' }, next())]
    expect(incidentOutcomes(log).meanSeconds).toBeNull()
  })
})

describe('defenseActivity', () => {
  it('remembers how exposed the run ever got, which no running total could', () => {
    const log = [
      defenseToggleEvent({ ruleId: 'rate-limiting', on: false, activeCount: 3 }, next()),
      defenseToggleEvent({ ruleId: 'payload-quarantine', on: false, activeCount: 2 }, next()),
      defenseToggleEvent({ ruleId: 'rate-limiting', on: true, activeCount: 3 }, next()),
      defenseToggleEvent({ ruleId: 'payload-quarantine', on: true, activeCount: 4 }, next()),
    ]

    expect(defenseActivity(log)).toEqual({ toggles: 4, turnedOff: 2, lowestActiveCount: 2 })
  })

  it('says nothing was ever lowered rather than claiming zero rules were on', () => {
    expect(defenseActivity([]).lowestActiveCount).toBeNull()
  })
})

describe('responsesUnderFullDefense', () => {
  it('counts only wins earned with every rule on', () => {
    const log = [
      response({ correct: true, allDefensesOn: true }),
      response({ correct: true, allDefensesOn: false }),
      response({ correct: false, allDefensesOn: true }),
    ]

    expect(responsesUnderFullDefense(log)).toBe(1)
  })
})

describe('analyzeSecurity', () => {
  it('answers every question the screen asks in one pass', () => {
    const log = [
      response({ severity: 'medium', correct: true, healthAfter: 100, scoreAfter: 10 }),
      incidentClosedEvent({ caseId: 'CV-001', outcome: 'escalated', seconds: 8 }, next()),
      missionCompletedEvent({ missionId: 'first-response' }, next()),
    ]

    const data = analyzeSecurity(log)
    expect(data.eventCount).toBe(3)
    expect(data.responses.accuracy).toBe(100)
    expect(data.incidents.escalated).toBe(1)
    expect(data.missionsCompleted).toBe(1)
    expect(data.health.map((point) => point.value)).toEqual([100])
  })

  it('renders a fresh run without throwing', () => {
    const data = analyzeSecurity([])
    expect(data.responses.total).toBe(0)
    expect(data.bySeverity).toHaveLength(4)
    expect(data.incidents.meanSeconds).toBeNull()
  })
})
