import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DECAY_AMOUNT,
  DECAY_INTERVAL_MS,
  DEFENSE_RULES,
  OVERALL_DEFENSE_STATUS,
  activeRuleIds,
  allRulesActive,
  createDecayInterval,
  getActiveRulesCount,
  getDefenseStatus,
  getInitialRuleStates,
  getProtectionCoverage,
  isRuleActive,
  shouldDecayHealth,
} from './defenseRules'

const ALL_ON = getInitialRuleStates()
const ids = DEFENSE_RULES.map((rule) => rule.id)

describe('a fresh rule map', () => {
  it('has every catalogue rule ON', () => {
    expect(Object.keys(ALL_ON)).toEqual(ids)
    expect(allRulesActive(ALL_ON)).toBe(true)
    expect(getActiveRulesCount(ALL_ON)).toBe(4)
    expect(getProtectionCoverage(ALL_ON)).toBe(100)
    expect(getDefenseStatus(ALL_ON)).toBe(OVERALL_DEFENSE_STATUS.FULLY_ACTIVE)
    expect(shouldDecayHealth(ALL_ON)).toBe(false)
  })
})

// The four readings the panel shows are computed by four different
// functions. If any of them disagrees, the player sees a panel that
// contradicts itself -- a rule drawn as DISABLED next to a header that
// says FULLY ACTIVE, or 0% coverage next to "WORLD HEALTH PROTECTED".
describe('the readings stay consistent with each other', () => {
  it('treats a rule missing from a saved map as OFF, not as absent', () => {
    const partial = { ...ALL_ON }
    delete partial['service-watchdog']

    expect(isRuleActive(partial, 'service-watchdog')).toBe(false)
    expect(getActiveRulesCount(partial)).toBe(3)
    expect(getProtectionCoverage(partial)).toBe(75)
    expect(getDefenseStatus(partial)).toBe(OVERALL_DEFENSE_STATUS.DEGRADED)
    expect(shouldDecayHealth(partial)).toBe(true)
  })

  it('reads an empty map as no protection at all, and decays for it', () => {
    expect(getActiveRulesCount({})).toBe(0)
    expect(getProtectionCoverage({})).toBe(0)
    expect(getDefenseStatus({})).toBe(OVERALL_DEFENSE_STATUS.CRITICAL)
    expect(shouldDecayHealth({})).toBe(true)
  })

  it('ignores a stale id left behind in a saved map', () => {
    const stale = { ...ALL_ON, 'rate-limiting': false, 'rule-that-no-longer-exists': true }

    expect(activeRuleIds(stale)).not.toContain('rule-that-no-longer-exists')
    expect(getActiveRulesCount(stale)).toBe(3)
    expect(getDefenseStatus(stale)).toBe(OVERALL_DEFENSE_STATUS.DEGRADED)
    expect(shouldDecayHealth(stale)).toBe(true)
  })

  it('survives an undefined map without throwing', () => {
    expect(getActiveRulesCount(undefined)).toBe(0)
    expect(shouldDecayHealth(undefined)).toBe(true)
    expect(isRuleActive(undefined, 'rate-limiting')).toBe(false)
  })
})

describe('overall status bands', () => {
  it('is CRITICAL only when every rule is OFF', () => {
    const allOff = Object.fromEntries(ids.map((id) => [id, false]))
    expect(getDefenseStatus(allOff)).toBe(OVERALL_DEFENSE_STATUS.CRITICAL)
    expect(getDefenseStatus({ ...allOff, 'rate-limiting': true })).toBe(
      OVERALL_DEFENSE_STATUS.DEGRADED
    )
  })
})

describe('health decay', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('requests -1 every 3 seconds while a rule is OFF', () => {
    const onHealthChange = vi.fn()
    const stop = createDecayInterval({ ...ALL_ON, 'rate-limiting': false }, onHealthChange)

    vi.advanceTimersByTime(DECAY_INTERVAL_MS * 3)
    expect(onHealthChange).toHaveBeenCalledTimes(3)
    expect(onHealthChange).toHaveBeenCalledWith(-DECAY_AMOUNT)

    stop()
    vi.advanceTimersByTime(DECAY_INTERVAL_MS * 5)
    expect(onHealthChange).toHaveBeenCalledTimes(3)
  })

  it('does not start at all when every rule is ON', () => {
    const onHealthChange = vi.fn()
    createDecayInterval(ALL_ON, onHealthChange)()

    vi.advanceTimersByTime(DECAY_INTERVAL_MS * 5)
    expect(onHealthChange).not.toHaveBeenCalled()
  })

  it('decays the same -1 no matter how many rules are OFF', () => {
    const one = vi.fn()
    const many = vi.fn()
    const stopOne = createDecayInterval({ ...ALL_ON, 'rate-limiting': false }, one)
    const stopMany = createDecayInterval(
      Object.fromEntries(ids.map((id) => [id, false])),
      many
    )

    vi.advanceTimersByTime(DECAY_INTERVAL_MS * 4)
    expect(one.mock.calls).toEqual(many.mock.calls)

    stopOne()
    stopMany()
  })
})
