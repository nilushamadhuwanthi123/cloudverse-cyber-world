import { describe, expect, it } from 'vitest'
import { RISK_LEVELS, assessRisk, dominantFactor, riskLevel } from './riskScore'

const allOn = { a: true, b: true, c: true, d: true }
const allOff = { a: false, b: false, c: false, d: false }

describe('riskLevel', () => {
  it('bands a reading', () => {
    expect(riskLevel(0)).toBe(RISK_LEVELS.LOW)
    expect(riskLevel(19)).toBe(RISK_LEVELS.LOW)
    expect(riskLevel(20)).toBe(RISK_LEVELS.ELEVATED)
    expect(riskLevel(44)).toBe(RISK_LEVELS.ELEVATED)
    expect(riskLevel(45)).toBe(RISK_LEVELS.HIGH)
    expect(riskLevel(69)).toBe(RISK_LEVELS.HIGH)
    expect(riskLevel(70)).toBe(RISK_LEVELS.SEVERE)
    expect(riskLevel(100)).toBe(RISK_LEVELS.SEVERE)
  })
})

describe('assessRisk', () => {
  it('reads zero for a healthy district with every defense on', () => {
    const risk = assessRisk({ worldHealth: 100, ruleStates: allOn })

    expect(risk.value).toBe(0)
    expect(risk.level).toBe(RISK_LEVELS.LOW)
  })

  it('reads maximum when everything is wrong at once', () => {
    const risk = assessRisk({ worldHealth: 0, ruleStates: allOff, hasActiveThreat: true })

    expect(risk.value).toBe(100)
    expect(risk.level).toBe(RISK_LEVELS.SEVERE)
  })

  it('is derived, so restoring a defense lowers it immediately', () => {
    const exposed = assessRisk({ worldHealth: 80, ruleStates: allOff })
    const restored = assessRisk({ worldHealth: 80, ruleStates: allOn })

    expect(restored.value).toBeLessThan(exposed.value)
  })

  it('rises as world health falls', () => {
    const healthy = assessRisk({ worldHealth: 100, ruleStates: allOn })
    const hurt = assessRisk({ worldHealth: 40, ruleStates: allOn })

    expect(hurt.value).toBeGreaterThan(healthy.value)
  })

  it('scales with how many defenses are off, not merely whether any is', () => {
    const one = assessRisk({ worldHealth: 100, ruleStates: { ...allOn, a: false } })
    const two = assessRisk({ worldHealth: 100, ruleStates: { ...allOn, a: false, b: false } })

    expect(two.value).toBeGreaterThan(one.value)
  })

  it('counts an unanswered threat as exposure in itself', () => {
    const quiet = assessRisk({ worldHealth: 100, ruleStates: allOn, hasActiveThreat: false })
    const live = assessRisk({ worldHealth: 100, ruleStates: allOn, hasActiveThreat: true })

    expect(live.value).toBeGreaterThan(quiet.value)
  })

  it('lets no single factor reach a severe reading on its own', () => {
    const healthOnly = assessRisk({ worldHealth: 0, ruleStates: allOn })
    const defensesOnly = assessRisk({ worldHealth: 100, ruleStates: allOff })
    const threatOnly = assessRisk({ worldHealth: 100, ruleStates: allOn, hasActiveThreat: true })

    for (const risk of [healthOnly, defensesOnly, threatOnly]) {
      expect(risk.level).not.toBe(RISK_LEVELS.SEVERE)
    }
  })

  it('clamps a health value from outside the expected range', () => {
    expect(assessRisk({ worldHealth: 140, ruleStates: allOn }).value).toBe(0)
    expect(assessRisk({ worldHealth: -20, ruleStates: allOn }).factors.health).toBe(50)
  })

  it('survives an empty rule set rather than dividing by zero', () => {
    const risk = assessRisk({ worldHealth: 100, ruleStates: {} })

    expect(Number.isNaN(risk.value)).toBe(false)
    expect(risk.factors.defenses).toBe(0)
  })

  it('breaks the reading down so the UI can explain it', () => {
    const risk = assessRisk({ worldHealth: 50, ruleStates: { ...allOn, a: false }, hasActiveThreat: true })

    const total = risk.factors.health + risk.factors.defenses + risk.factors.activeThreat
    expect(Math.abs(total - risk.value)).toBeLessThanOrEqual(1)
  })
})

describe('dominantFactor', () => {
  it('names the biggest contributor', () => {
    const healthDriven = assessRisk({ worldHealth: 10, ruleStates: allOn })
    expect(dominantFactor(healthDriven)).toBe('health')

    const defenseDriven = assessRisk({ worldHealth: 100, ruleStates: allOff })
    expect(dominantFactor(defenseDriven)).toBe('defenses')
  })

  it('returns null when nothing is contributing', () => {
    expect(dominantFactor(assessRisk({ worldHealth: 100, ruleStates: allOn }))).toBeNull()
  })
})
