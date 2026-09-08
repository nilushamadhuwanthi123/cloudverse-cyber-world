import { describe, expect, it } from 'vitest'
import {
  CONTAINMENT_ACTIONS,
  appropriateActions,
  applyContainment,
  findContainmentAction,
  summariseContainment,
} from './containment'
import { INCIDENT_CASES } from '../data/incidentCases'

describe('the action catalogue', () => {
  it('gives every action a security effect and an operational cost', () => {
    for (const action of CONTAINMENT_ACTIONS) {
      expect(action.effects.risk).toBeLessThan(0)
      expect(action.effects).toHaveProperty('cloudAvailability')
      expect(action.effects).toHaveProperty('pipelineStatus')
    }
  })

  it('states the trade-off for every action, since that is the lesson', () => {
    for (const action of CONTAINMENT_ACTIONS) {
      expect(action.tradeOff.length).toBeGreaterThan(0)
    }
  })

  it('includes at least one action that costs availability', () => {
    expect(CONTAINMENT_ACTIONS.some((a) => a.effects.cloudAvailability < 0)).toBe(true)
  })

  it('includes an action that blocks the pipeline', () => {
    expect(CONTAINMENT_ACTIONS.some((a) => a.effects.pipelineStatus === 'blocked')).toBe(true)
  })
})

describe('appropriateActions', () => {
  it('names appropriate actions for every case in the catalogue', () => {
    for (const c of INCIDENT_CASES) {
      expect(appropriateActions(c.id).length).toBeGreaterThan(0)
    }
  })

  it('only names actions that exist', () => {
    for (const c of INCIDENT_CASES) {
      for (const id of appropriateActions(c.id)) {
        expect(findContainmentAction(id)).not.toBeNull()
      }
    }
  })

  it('matches the action to the incident rather than ranking once for all', () => {
    expect(appropriateActions('login-burst')).toContain('disable-account')
    expect(appropriateActions('deployment-artifact')).toContain('pause-deployment')
    expect(appropriateActions('deployment-artifact')).not.toContain('disable-account')
  })

  it('returns nothing for an unknown case rather than throwing', () => {
    expect(appropriateActions('no-such-case')).toEqual([])
  })
})

describe('applyContainment', () => {
  it('gives the full risk reduction for an appropriate action', () => {
    const result = applyContainment('login-burst', 'disable-account')

    expect(result.ok).toBe(true)
    expect(result.appropriate).toBe(true)
    expect(result.effects.risk).toBe(-20)
  })

  it('allows an inappropriate action but reduces risk far less', () => {
    const result = applyContainment('deployment-artifact', 'disable-account')

    expect(result.ok).toBe(true)
    expect(result.appropriate).toBe(false)
    expect(result.effects.risk).toBe(-5)
  })

  it('still charges the operational cost of a wrong action', () => {
    const wrong = applyContainment('login-burst', 'pause-deployment')

    expect(wrong.appropriate).toBe(false)
    expect(wrong.effects.pipelineStatus).toBe('blocked')
  })

  it('carries the trade-off through so the player can be told', () => {
    const result = applyContainment('login-burst', 'isolate-server')
    expect(result.tradeOff).toContain('offline')
  })

  it('refuses an unknown action safely', () => {
    const result = applyContainment('login-burst', 'nonsense')

    expect(result.ok).toBe(false)
    expect(result.reason).toContain('Unknown containment action')
    expect(result.effects).toBeNull()
  })

  it('does not mutate the action catalogue', () => {
    const before = findContainmentAction('isolate-server').effects.risk
    applyContainment('deployment-artifact', 'isolate-server')
    expect(findContainmentAction('isolate-server').effects.risk).toBe(before)
  })
})

describe('the trade-off itself', () => {
  it('makes the strongest containment also the most operationally expensive', () => {
    const isolate = findContainmentAction('isolate-server')
    const block = findContainmentAction('block-endpoint')

    expect(isolate.effects.risk).toBeLessThan(block.effects.risk)
    expect(isolate.effects.cloudAvailability).toBeLessThan(block.effects.cloudAvailability)
  })
})

describe('summariseContainment', () => {
  it('adds up risk and availability across the choices made', () => {
    const summary = summariseContainment('login-burst', ['disable-account', 'isolate-server'])

    expect(summary.riskChange).toBe(-45)
    expect(summary.availabilityChange).toBe(-35)
    expect(summary.anyAppropriate).toBe(true)
  })

  it('reports the pipeline as blocked when a choice blocked it', () => {
    const summary = summariseContainment('deployment-artifact', ['pause-deployment'])
    expect(summary.pipelineBlocked).toBe(true)
  })

  it('reports no appropriate action when none of the choices addressed the incident', () => {
    const summary = summariseContainment('login-burst', ['block-endpoint', 'raise-defenses'])
    expect(summary.anyAppropriate).toBe(false)
  })

  it('skips unknown actions instead of failing the whole summary', () => {
    const summary = summariseContainment('login-burst', ['disable-account', 'nonsense'])
    expect(summary.actions).toHaveLength(1)
  })

  it('handles no choices at all', () => {
    const summary = summariseContainment('login-burst', [])
    expect(summary.riskChange).toBe(0)
    expect(summary.pipelineBlocked).toBe(false)
  })
})
