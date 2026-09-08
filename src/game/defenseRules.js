/**
 * Defense rule catalogue and rules engine.
 *
 * A fixed set of four toggleable rules representing a simulated firewall layer:
 *  1. Block Unauthorized IPs
 *  2. Rate Limiting
 *  3. Payload Quarantine
 *  4. Service Watchdog
 *
 * Pure JavaScript rule module (game/ layer, no DOM, no JSX, no localStorage).
 * Everything here is fictional simulation for the CLOUDVERSE digital world.
 */

export const DECAY_INTERVAL_MS = 3000
export const DECAY_AMOUNT = 1

export const OVERALL_DEFENSE_STATUS = {
  FULLY_ACTIVE: 'FULLY ACTIVE',
  DEGRADED: 'DEGRADED',
  CRITICAL: 'CRITICAL',
}

export const DEFENSE_RULES = Object.freeze([
  Object.freeze({
    id: 'block-unauthorized-ips',
    title: 'Block Unauthorized IPs',
    label: 'Block Unauthorized IPs',
    category: 'Access Control',
    description: 'Blocks connections from IP addresses flagged for suspicious login attempts.',
  }),
  Object.freeze({
    id: 'rate-limiting',
    title: 'Rate Limiting',
    label: 'Rate Limiting',
    category: 'Traffic Shaping',
    description: 'Caps how many requests a single source can send in a short window.',
  }),
  Object.freeze({
    id: 'payload-quarantine',
    title: 'Payload Quarantine',
    label: 'Payload Quarantine',
    category: 'Signature Analysis',
    description: 'Isolates uploaded files that match known-malicious signatures before they run.',
  }),
  Object.freeze({
    id: 'service-watchdog',
    title: 'Service Watchdog',
    label: 'Service Watchdog',
    category: 'Runtime Integrity',
    description: 'Automatically restarts a core service if it stops responding.',
  }),
])
// The catalogue is the single source of truth for which rules exist.
// Every reading below is derived from these ids rather than from the
// keys a caller's object happens to carry, so a saved payload that is
// missing a rule -- or still carrying one that was renamed away -- can
// never be read as protection the player does not have.
const RULE_IDS = DEFENSE_RULES.map((rule) => rule.id)

/**
 * Reads one rule out of a possibly partial state map.
 *
 * A missing id reads as OFF, which is exactly what the panel already
 * renders for it. Anything not in the catalogue is ignored.
 */
export function isRuleActive(ruleStates, ruleId) {
  return Boolean(ruleStates?.[ruleId])
}

/** The catalogue ids that are currently ON. */
export function activeRuleIds(ruleStates = {}) {
  return RULE_IDS.filter((id) => isRuleActive(ruleStates, id))
}

/** True only when every rule in the catalogue is ON. */
export function allRulesActive(ruleStates = {}) {
  return activeRuleIds(ruleStates).length === RULE_IDS.length
}

/**
 * Returns a fresh map with all four rules initially set to ON (true).
 */
export function getInitialRuleStates() {
  return Object.fromEntries(RULE_IDS.map((id) => [id, true]))
}

/**
 * Calculates the number of active rules.
 */
export function getActiveRulesCount(ruleStates = {}) {
  return activeRuleIds(ruleStates).length
}

/**
 * Calculates defense protection coverage percentage (0 - 100).
 */
export function getProtectionCoverage(ruleStates = {}) {
  const total = RULE_IDS.length
  if (total === 0) return 0
  return Math.round((getActiveRulesCount(ruleStates) / total) * 100)
}

/**
 * Evaluates the overall system defense status.
 * - All 4 rules ON: FULLY ACTIVE
 * - 1 to 3 rules ON: DEGRADED
 * - 0 rules ON: CRITICAL
 */
export function getDefenseStatus(ruleStates = {}) {
  const activeCount = getActiveRulesCount(ruleStates)
  if (activeCount === RULE_IDS.length) {
    return OVERALL_DEFENSE_STATUS.FULLY_ACTIVE
  }
  if (activeCount === 0) {
    return OVERALL_DEFENSE_STATUS.CRITICAL
  }
  return OVERALL_DEFENSE_STATUS.DEGRADED
}

/**
 * Returns true if ANY defense rule is not ON, triggering world health
 * decay. Phrased as "not all active" rather than "some are false" so a
 * rule that is absent from the map counts against the player the same
 * way the panel shows it: DISABLED.
 */
export function shouldDecayHealth(ruleStates = {}) {
  return !allRulesActive(ruleStates)
}

/**
 * Manages the health decay interval safely.
 * Requests -1 World Health every 3000ms while any rule is OFF.
 * Returns a cleanup function that stops the interval.
 */
export function createDecayInterval(ruleStates, onHealthChange) {
  if (!shouldDecayHealth(ruleStates) || typeof onHealthChange !== 'function') {
    return () => {}
  }

  const intervalId = setInterval(() => {
    onHealthChange(-DECAY_AMOUNT)
  }, DECAY_INTERVAL_MS)

  return () => {
    clearInterval(intervalId)
  }
}
