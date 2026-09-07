/**
 * Threat engine.
 *
 * Design is Kavindu's: threat generation is system-state based with
 * controlled randomness rather than pure random, so the district feels
 * like it is reacting to its own condition instead of rolling dice in a
 * vacuum. A low world health both raises the chance of a threat firing
 * and skews which threat type shows up.
 *
 * Lifecycle: Detected -> Analyzing -> Active -> Player Response ->
 * Resolved / Escalated. Only "Active" accepts a player response --
 * Detected and Analyzing are a brief automatic pause before the player
 * can act, matching how a real detection pipeline would not hand a
 * fully-formed incident to a human instantly.
 *
 * Everything here is fictional and self-contained -- no real attack
 * technique, tool, or telemetry (spec 52).
 */
import { THREAT_TYPE_LIST, resolveSeverity } from './threatTypes'

export const LIFECYCLE = {
  DETECTED: 'detected',
  ANALYZING: 'analyzing',
  ACTIVE: 'active',
  RESOLVED: 'resolved',
  ESCALATED: 'escalated',
}

export const INITIAL_WORLD_HEALTH = 100
const RESOLVED_DELTA = 5
const ESCALATED_DELTA = -10

/**
 * Picks a threat type with controlled randomness: every type has a
 * baseline weight, but a low world health biases the pick toward the
 * more severe types (traffic flood, malicious payload) -- a district
 * already under strain sees proportionally more of its dangerous
 * threats, not just more threats overall.
 */
export function pickThreatType(worldHealth, rng = Math.random) {
  const strained = worldHealth < 50
  const weights = THREAT_TYPE_LIST.map((type) => {
    const isSevere = type.baseSeverity === 'high' || type.baseSeverity === 'critical'
    return strained && isSevere ? 2 : 1
  })

  const total = weights.reduce((sum, w) => sum + w, 0)
  let roll = rng() * total
  for (let i = 0; i < THREAT_TYPE_LIST.length; i += 1) {
    roll -= weights[i]
    if (roll <= 0) return THREAT_TYPE_LIST[i]
  }
  return THREAT_TYPE_LIST[THREAT_TYPE_LIST.length - 1]
}

let nextThreatId = 1

/** Creates a freshly-detected threat instance, not yet open to a player response. */
export function spawnThreat(worldHealth, rng = Math.random) {
  const type = pickThreatType(worldHealth, rng)
  return {
    id: `threat-${nextThreatId++}`,
    type,
    severity: resolveSeverity(type, worldHealth),
    stage: LIFECYCLE.DETECTED,
    resolution: null, // set once the player responds or the window times out
  }
}

/** Advances a threat one lifecycle stage forward, stopping once it is open to a response. */
export function advanceThreat(threat) {
  if (threat.stage === LIFECYCLE.DETECTED) {
    return { ...threat, stage: LIFECYCLE.ANALYZING }
  }
  if (threat.stage === LIFECYCLE.ANALYZING) {
    return { ...threat, stage: LIFECYCLE.ACTIVE }
  }
  return threat
}

/**
 * Resolves a player's chosen defense action against an active threat.
 *
 * Returns the updated threat (now Resolved or Escalated, carrying the
 * explanation for the action taken) and the world-health delta to
 * apply -- +5 for a correct response, -10 for a wrong one, matching a
 * wrong response and a timeout the same way since neither actually
 * stopped the threat.
 */
export function resolveThreatResponse(threat, actionId) {
  const action = threat.type.actions.find((a) => a.id === actionId)
  if (!action) {
    throw new Error(`Unknown defense action "${actionId}" for threat type "${threat.type.id}"`)
  }

  return {
    threat: {
      ...threat,
      stage: action.correct ? LIFECYCLE.RESOLVED : LIFECYCLE.ESCALATED,
      resolution: { actionId: action.id, correct: action.correct, explanation: action.explanation },
    },
    healthDelta: action.correct ? RESOLVED_DELTA : ESCALATED_DELTA,
  }
}

/** A response window that expired with no player action -- treated the same as a wrong answer. */
export function escalateFromTimeout(threat) {
  return {
    threat: {
      ...threat,
      stage: LIFECYCLE.ESCALATED,
      resolution: {
        actionId: null,
        correct: false,
        explanation: 'No response was taken in time, so the threat was left free to run its course.',
      },
    },
    healthDelta: ESCALATED_DELTA,
  }
}

/** Clamps world health into the 0-100 range every update should stay within. */
export function clampWorldHealth(value) {
  return Math.max(0, Math.min(100, value))
}
