/**
 * Risk scoring.
 *
 * The one concept game/README.md names that the district had no
 * implementation for. Everything else there -- world health, security
 * score, mission state, unlock order -- now exists; this closes the set.
 *
 * Risk is not another score. Score and health are records of what has
 * already happened; risk is a reading of the district's current
 * exposure, so it is derived rather than accumulated: give it the
 * present state and it tells you how exposed the district is right now.
 * Turning a defense back on lowers risk immediately, which a running
 * total could never do.
 */

export const RISK_LEVELS = {
  LOW: 'low',
  ELEVATED: 'elevated',
  HIGH: 'high',
  SEVERE: 'severe',
}

// Weights are relative, and chosen so no single factor can reach a
// severe reading alone -- a district is only severely exposed when
// more than one thing is wrong at once.
const HEALTH_WEIGHT = 50
const DEFENSE_WEIGHT = 35
const ACTIVE_THREAT_WEIGHT = 15

/**
 * How much the current world health contributes.
 *
 * Full health contributes nothing; zero health contributes everything
 * available to it, scaling linearly in between.
 */
function healthRisk(worldHealth) {
  const clamped = Math.max(0, Math.min(100, worldHealth))
  return ((100 - clamped) / 100) * HEALTH_WEIGHT
}

/** How much the disabled defenses contribute, as a share of all rules. */
function defenseRisk(ruleStates) {
  const rules = Object.values(ruleStates)
  if (rules.length === 0) return 0

  const off = rules.filter((isOn) => !isOn).length
  return (off / rules.length) * DEFENSE_WEIGHT
}

/** A threat currently awaiting a response is exposure in itself. */
function activeThreatRisk(hasActiveThreat) {
  return hasActiveThreat ? ACTIVE_THREAT_WEIGHT : 0
}

/**
 * Current risk as a 0-100 reading plus the band it falls in.
 *
 * Returns the contributing parts as well, so the UI can explain a
 * reading rather than only display it -- "why is this high" is the
 * question a player actually has.
 */
export function assessRisk({ worldHealth, ruleStates, hasActiveThreat = false }) {
  const fromHealth = healthRisk(worldHealth)
  const fromDefenses = defenseRisk(ruleStates)
  const fromActiveThreat = activeThreatRisk(hasActiveThreat)

  const value = Math.round(fromHealth + fromDefenses + fromActiveThreat)

  return {
    value,
    level: riskLevel(value),
    factors: {
      health: Math.round(fromHealth),
      defenses: Math.round(fromDefenses),
      activeThreat: Math.round(fromActiveThreat),
    },
  }
}

/** The band a 0-100 risk reading falls into. */
export function riskLevel(value) {
  if (value >= 70) return RISK_LEVELS.SEVERE
  if (value >= 45) return RISK_LEVELS.HIGH
  if (value >= 20) return RISK_LEVELS.ELEVATED
  return RISK_LEVELS.LOW
}

/**
 * The single biggest contributor to the current reading, or null when
 * nothing is contributing. What the player should deal with first.
 */
export function dominantFactor(assessment) {
  const entries = Object.entries(assessment.factors).filter(([, amount]) => amount > 0)
  if (entries.length === 0) return null

  return entries.reduce((worst, entry) => (entry[1] > worst[1] ? entry : worst))[0]
}
