import { describe, expect, it } from 'vitest'
import {
  INITIAL_WORLD_HEALTH,
  LIFECYCLE,
  advanceThreat,
  clampWorldHealth,
  escalateFromTimeout,
  pickThreatType,
  resolveThreatResponse,
  spawnThreat,
} from './threatEngine'
import { THREAT_TYPE_LIST, resolveSeverity } from './threatTypes'

describe('clampWorldHealth', () => {
  it('keeps values inside 0-100', () => {
    expect(clampWorldHealth(150)).toBe(100)
    expect(clampWorldHealth(-20)).toBe(0)
    expect(clampWorldHealth(42)).toBe(42)
  })
})

describe('threat types', () => {
  it('gives every threat type exactly one correct action', () => {
    for (const type of THREAT_TYPE_LIST) {
      const correct = type.actions.filter((action) => action.correct)
      expect(correct).toHaveLength(1)
    }
  })

  it('gives every action an explanation, so a wrong answer still teaches', () => {
    for (const type of THREAT_TYPE_LIST) {
      for (const action of type.actions) {
        expect(action.explanation.length).toBeGreaterThan(0)
      }
    }
  })
})

describe('resolveSeverity', () => {
  it('uses the base severity while the world is healthy', () => {
    for (const type of THREAT_TYPE_LIST) {
      expect(resolveSeverity(type, 100)).toBe(type.baseSeverity)
    }
  })

  it('escalates one level when world health is low', () => {
    const medium = THREAT_TYPE_LIST.find((type) => type.baseSeverity === 'medium')
    expect(resolveSeverity(medium, 20)).toBe('high')
  })

  it('never escalates past critical', () => {
    const critical = THREAT_TYPE_LIST.find((type) => type.baseSeverity === 'critical')
    if (critical) expect(resolveSeverity(critical, 1)).toBe('critical')
  })
})

describe('pickThreatType', () => {
  it('is deterministic for a given roll', () => {
    const first = pickThreatType(100, () => 0)
    expect(pickThreatType(100, () => 0)).toBe(first)
  })

  it('always returns a known threat type across the whole roll range', () => {
    for (const roll of [0, 0.25, 0.5, 0.75, 0.999999]) {
      expect(THREAT_TYPE_LIST).toContain(pickThreatType(100, () => roll))
    }
  })

  it('biases toward severe types when the world is strained', () => {
    const isSevere = (type) => type.baseSeverity === 'high' || type.baseSeverity === 'critical'
    const rolls = Array.from({ length: 50 }, (_, i) => i / 50)

    const healthy = rolls.filter((roll) => isSevere(pickThreatType(100, () => roll))).length
    const strained = rolls.filter((roll) => isSevere(pickThreatType(20, () => roll))).length

    expect(strained).toBeGreaterThan(healthy)
  })
})

describe('spawnThreat', () => {
  it('starts a threat at the detected stage with no resolution', () => {
    const threat = spawnThreat(INITIAL_WORLD_HEALTH, () => 0)

    expect(threat.stage).toBe(LIFECYCLE.DETECTED)
    expect(threat.resolution).toBeNull()
    expect(threat.severity).toBe(threat.type.baseSeverity)
  })

  it('gives each threat a distinct id', () => {
    const a = spawnThreat(100, () => 0)
    const b = spawnThreat(100, () => 0)
    expect(a.id).not.toBe(b.id)
  })
})

describe('advanceThreat', () => {
  it('walks detected to analyzing to active, then stops', () => {
    const detected = spawnThreat(100, () => 0)
    const analyzing = advanceThreat(detected)
    const active = advanceThreat(analyzing)

    expect(analyzing.stage).toBe(LIFECYCLE.ANALYZING)
    expect(active.stage).toBe(LIFECYCLE.ACTIVE)
    expect(advanceThreat(active).stage).toBe(LIFECYCLE.ACTIVE)
  })
})

describe('resolveThreatResponse', () => {
  const activeThreat = () => advanceThreat(advanceThreat(spawnThreat(100, () => 0)))

  it('resolves and rewards the correct action', () => {
    const threat = activeThreat()
    const correctAction = threat.type.actions.find((action) => action.correct)

    const { threat: resolved, healthDelta } = resolveThreatResponse(threat, correctAction.id)

    expect(resolved.stage).toBe(LIFECYCLE.RESOLVED)
    expect(resolved.resolution.correct).toBe(true)
    expect(healthDelta).toBe(5)
  })

  it('escalates and penalises a wrong action', () => {
    const threat = activeThreat()
    const wrongAction = threat.type.actions.find((action) => !action.correct)

    const { threat: resolved, healthDelta } = resolveThreatResponse(threat, wrongAction.id)

    expect(resolved.stage).toBe(LIFECYCLE.ESCALATED)
    expect(resolved.resolution.correct).toBe(false)
    expect(healthDelta).toBe(-10)
  })

  it('carries the chosen action explanation into the resolution', () => {
    const threat = activeThreat()
    const action = threat.type.actions[0]

    const { threat: resolved } = resolveThreatResponse(threat, action.id)
    expect(resolved.resolution.explanation).toBe(action.explanation)
  })

  it('throws on an action that does not belong to this threat type', () => {
    expect(() => resolveThreatResponse(activeThreat(), 'no-such-action')).toThrow()
  })

  it('does not mutate the threat it resolves', () => {
    const threat = activeThreat()
    const snapshot = JSON.parse(JSON.stringify(threat))

    resolveThreatResponse(threat, threat.type.actions[0].id)
    expect(JSON.parse(JSON.stringify(threat))).toEqual(snapshot)
  })
})

describe('escalateFromTimeout', () => {
  it('costs the same as a wrong answer, because neither stopped the threat', () => {
    const threat = advanceThreat(advanceThreat(spawnThreat(100, () => 0)))
    const { threat: escalated, healthDelta } = escalateFromTimeout(threat)

    expect(escalated.stage).toBe(LIFECYCLE.ESCALATED)
    expect(escalated.resolution.correct).toBe(false)
    expect(escalated.resolution.actionId).toBeNull()
    expect(healthDelta).toBe(-10)
  })
})
