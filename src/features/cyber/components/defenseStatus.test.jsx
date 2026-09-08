import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderToString } from 'react-dom/server'
import DefenseStatus from './DefenseStatus'
import {
  DEFENSE_RULES,
  OVERALL_DEFENSE_STATUS,
  getInitialRuleStates,
  getActiveRulesCount,
  getProtectionCoverage,
  getDefenseStatus,
  shouldDecayHealth,
  createDecayInterval,
  DECAY_INTERVAL_MS,
  DECAY_AMOUNT,
} from '../../../game/defenseRules'

describe('Defense Rules Catalogue & State Logic', () => {
  it('defines exactly four fixed defensive rules', () => {
    expect(DEFENSE_RULES).toHaveLength(4)
    const ids = DEFENSE_RULES.map((r) => r.id)
    expect(ids).toEqual([
      'block-unauthorized-ips',
      'rate-limiting',
      'payload-quarantine',
      'service-watchdog',
    ])
  })

  it('renders required rule titles and descriptions correctly', () => {
    const titles = DEFENSE_RULES.map((r) => r.title)
    expect(titles).toContain('Block Unauthorized IPs')
    expect(titles).toContain('Rate Limiting')
    expect(titles).toContain('Payload Quarantine')
    expect(titles).toContain('Service Watchdog')

    DEFENSE_RULES.forEach((rule) => {
      expect(rule.description).toBeDefined()
      expect(rule.description.length).toBeGreaterThan(15)
    })
  })

  it('enforces immutability: rules array and objects cannot be mutated or extended', () => {
    expect(Object.isFrozen(DEFENSE_RULES)).toBe(true)
    DEFENSE_RULES.forEach((rule) => {
      expect(Object.isFrozen(rule)).toBe(true)
    })
  })

  it('initializes all four rules to ON (true)', () => {
    const initial = getInitialRuleStates()
    expect(Object.keys(initial)).toHaveLength(4)
    expect(Object.values(initial).every(Boolean)).toBe(true)
    expect(getActiveRulesCount(initial)).toBe(4)
    expect(getProtectionCoverage(initial)).toBe(100)
  })

  it('evaluates overall defense status: FULLY ACTIVE when all ON, DEGRADED when any OFF, CRITICAL when all OFF', () => {
    const allOn = getInitialRuleStates()
    expect(getDefenseStatus(allOn)).toBe(OVERALL_DEFENSE_STATUS.FULLY_ACTIVE)

    const oneOff = { ...allOn, 'rate-limiting': false }
    expect(getDefenseStatus(oneOff)).toBe(OVERALL_DEFENSE_STATUS.DEGRADED)
    expect(getActiveRulesCount(oneOff)).toBe(3)
    expect(getProtectionCoverage(oneOff)).toBe(75)

    const twoOff = { ...oneOff, 'payload-quarantine': false }
    expect(getDefenseStatus(twoOff)).toBe(OVERALL_DEFENSE_STATUS.DEGRADED)

    const allOff = Object.fromEntries(DEFENSE_RULES.map((r) => [r.id, false]))
    expect(getDefenseStatus(allOff)).toBe(OVERALL_DEFENSE_STATUS.CRITICAL)
    expect(getActiveRulesCount(allOff)).toBe(0)
    expect(getProtectionCoverage(allOff)).toBe(0)
  })

  it('identifies health decay trigger: false when all ON, true when any OFF', () => {
    const allOn = getInitialRuleStates()
    expect(shouldDecayHealth(allOn)).toBe(false)

    expect(shouldDecayHealth({ ...allOn, 'block-unauthorized-ips': false })).toBe(true)
    expect(shouldDecayHealth({ ...allOn, 'rate-limiting': false })).toBe(true)
    expect(shouldDecayHealth({ ...allOn, 'payload-quarantine': false })).toBe(true)
    expect(shouldDecayHealth({ ...allOn, 'service-watchdog': false })).toBe(true)
  })
})

describe('Health Decay Interval Mechanism', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.restoreAllMocks()
  })

  it('does not trigger decay when all rules are ON', () => {
    const onHealthChange = vi.fn()
    const cleanup = createDecayInterval(getInitialRuleStates(), onHealthChange)

    vi.advanceTimersByTime(DECAY_INTERVAL_MS * 3)
    expect(onHealthChange).not.toHaveBeenCalled()
    cleanup()
  })

  it('requests exactly -1 health every 3 seconds when a rule is OFF', () => {
    const onHealthChange = vi.fn()
    const oneOff = { ...getInitialRuleStates(), 'rate-limiting': false }
    const cleanup = createDecayInterval(oneOff, onHealthChange)

    expect(onHealthChange).not.toHaveBeenCalled()

    vi.advanceTimersByTime(DECAY_INTERVAL_MS)
    expect(onHealthChange).toHaveBeenCalledTimes(1)
    expect(onHealthChange).toHaveBeenCalledWith(-DECAY_AMOUNT)

    vi.advanceTimersByTime(DECAY_INTERVAL_MS)
    expect(onHealthChange).toHaveBeenCalledTimes(2)

    vi.advanceTimersByTime(DECAY_INTERVAL_MS)
    expect(onHealthChange).toHaveBeenCalledTimes(3)

    cleanup()
  })

  it('does NOT multiply decay when multiple rules are OFF (strictly -1 per 3s)', () => {
    const onHealthChange = vi.fn()
    const allOff = Object.fromEntries(DEFENSE_RULES.map((r) => [r.id, false]))
    const cleanup = createDecayInterval(allOff, onHealthChange)

    vi.advanceTimersByTime(DECAY_INTERVAL_MS)
    expect(onHealthChange).toHaveBeenCalledTimes(1)
    expect(onHealthChange).toHaveBeenCalledWith(-1)

    vi.advanceTimersByTime(DECAY_INTERVAL_MS)
    expect(onHealthChange).toHaveBeenCalledTimes(2)

    cleanup()
  })

  it('stops decay and cleans up the interval when cleanup is invoked', () => {
    const onHealthChange = vi.fn()
    const oneOff = { ...getInitialRuleStates(), 'service-watchdog': false }
    const cleanup = createDecayInterval(oneOff, onHealthChange)

    vi.advanceTimersByTime(DECAY_INTERVAL_MS)
    expect(onHealthChange).toHaveBeenCalledTimes(1)

    // Stop decay
    cleanup()

    vi.advanceTimersByTime(DECAY_INTERVAL_MS * 3)
    expect(onHealthChange).toHaveBeenCalledTimes(1) // No new calls
  })
})

describe('DefenseStatus Component Rendering & Accessibility', () => {
  it('renders all four defense rules with titles and descriptions', () => {
    const html = renderToString(<DefenseStatus onHealthChange={() => {}} />)

    expect(html).toContain('Block Unauthorized IPs')
    expect(html).toContain('Rate Limiting')
    expect(html).toContain('Payload Quarantine')
    expect(html).toContain('Service Watchdog')

    DEFENSE_RULES.forEach((rule) => {
      expect(html).toContain(rule.description)
    })
  })

  it('renders initially with all rules ON, FULLY ACTIVE, and HEALTH DECAY INACTIVE', () => {
    const html = renderToString(<DefenseStatus onHealthChange={() => {}} />)

    expect(html).toContain('FULLY ACTIVE')
    expect(html).toContain('4 / 4 RULES ACTIVE')
    expect(html).toContain('100% COVERAGE')
    expect(html).toContain('HEALTH DECAY:')
    expect(html).toContain('INACTIVE')
    expect(html).toContain('WORLD HEALTH PROTECTED')
  })

  it('provides accessible semantic switches with role="switch" and aria-checked', () => {
    const html = renderToString(<DefenseStatus onHealthChange={() => {}} />)

    expect(html).toContain('role="switch"')
    expect(html).toContain('aria-checked="true"')
    expect(html).toContain('aria-label="Block Unauthorized IPs — ON"')
    expect(html).toContain('aria-label="Rate Limiting — ON"')
  })

  it('does NOT render any add, delete, or edit rule controls (rules are fixed)', () => {
    const html = renderToString(<DefenseStatus onHealthChange={() => {}} />)

    expect(html).not.toContain('Add Rule')
    expect(html).not.toContain('Delete Rule')
    expect(html).not.toContain('Edit Rule')
    expect(html).not.toContain('Manage Rules')
  })

  it('reflects DEGRADED status and active decay in controlled mode when a rule is OFF', () => {
    const ruleStates = {
      ...getInitialRuleStates(),
      'rate-limiting': false,
    }

    const html = renderToString(
      <DefenseStatus
        ruleStates={ruleStates}
        onToggleRule={() => {}}
        onHealthChange={() => {}}
      />
    )

    expect(html).toContain('DEGRADED')
    expect(html).toContain('3 / 4 RULES ACTIVE')
    expect(html).toContain('75% COVERAGE')
    expect(html).toContain('-1 / 3s')
    expect(html).toContain('DEFENSE INTEGRITY LEAKING')
    expect(html).toContain('aria-label="Rate Limiting — OFF"')
    expect(html).toContain('aria-checked="false"')
  })

  it('reflects CRITICAL status when all rules are OFF', () => {
    const allOff = Object.fromEntries(DEFENSE_RULES.map((r) => [r.id, false]))

    const html = renderToString(
      <DefenseStatus
        ruleStates={allOff}
        onToggleRule={() => {}}
        onHealthChange={() => {}}
      />
    )

    expect(html).toContain('CRITICAL')
    expect(html).toContain('0 / 4 RULES ACTIVE')
    expect(html).toContain('0% COVERAGE')
    expect(html).toContain('-1 / 3s')
  })

  // Regression: the header readings and the decay banner used to be
  // computed from whatever keys the map carried, while each rule row was
  // drawn from the catalogue. A saved map missing a rule therefore drew
  // that rule as DISABLED next to a banner saying health was protected.
  it('does not contradict itself when a saved map is missing a rule', () => {
    const partial = { ...getInitialRuleStates() }
    delete partial['service-watchdog']

    const html = renderToString(
      <DefenseStatus ruleStates={partial} onToggleRule={() => {}} onHealthChange={() => {}} />
    )

    expect(html).toContain('aria-label="Service Watchdog — OFF"')
    expect(html).toContain('3 / 4 RULES ACTIVE')
    expect(html).toContain('75% COVERAGE')
    expect(html).toContain('DEGRADED')
    expect(html).toContain('DEFENSE INTEGRITY LEAKING')
    expect(html).not.toContain('WORLD HEALTH PROTECTED')
  })
})
