/**
 * District progression and unlock rules.
 *
 * Implements the CLOUDVERSE district lifecycle and unlock progression:
 *   CORE + CLOUD -> DEVOPS -> CYBER -> ADVANCED CORE
 *
 * Provides status evaluations (LOCKED, AVAILABLE, ACTIVE, COMPLETED)
 * derived from player progress snapshots without mutating state.
 *
 * Pure JavaScript rule module (game/ layer).
 */

export const DISTRICT_STATUS = {
  LOCKED: 'locked',
  AVAILABLE: 'available',
  ACTIVE: 'active',
  COMPLETED: 'completed',
}

export const DISTRICT_IDS = {
  CORE: 'core',
  CLOUD: 'cloud',
  DEVOPS: 'devops',
  CYBER: 'cyber',
}

export const DISTRICT_ORDER = [
  DISTRICT_IDS.CORE,
  DISTRICT_IDS.CLOUD,
  DISTRICT_IDS.DEVOPS,
  DISTRICT_IDS.CYBER,
]

/**
 * Evaluates the status of a specific district given the player's progress and UI overrides.
 *
 * @param {string} districtId - 'core' | 'cloud' | 'devops' | 'cyber'
 * @param {object} progress - Stored progress object from progressService
 * @param {object} [overrides={}] - Optional simulation overrides (e.g. { cyber: true })
 * @returns {string} One of DISTRICT_STATUS values
 */
export function evaluateDistrictStatus(districtId, progress = {}, overrides = {}) {
  const completedMissions = Array.isArray(progress?.completedMissionIds)
    ? progress.completedMissionIds
    : []
  const securityScore = typeof progress?.securityScore === 'number' ? progress.securityScore : 0
  const correctResponses = typeof progress?.correctResponses === 'number' ? progress.correctResponses : 0

  switch (districtId) {
    case DISTRICT_IDS.CORE:
      return DISTRICT_STATUS.ACTIVE

    case DISTRICT_IDS.CLOUD:
      // Foundation district is always online and ready for exploration
      return DISTRICT_STATUS.ACTIVE

    case DISTRICT_IDS.DEVOPS:
      // DevOps Pipeline is available for continuous deployment drills
      if (overrides[DISTRICT_IDS.DEVOPS] === 'completed') {
        return DISTRICT_STATUS.COMPLETED
      }
      return DISTRICT_STATUS.AVAILABLE

    case DISTRICT_IDS.CYBER: {
      // Cyber Security Command unlocks after security clearance or prior participation
      if (overrides[DISTRICT_IDS.CYBER] === true || overrides[DISTRICT_IDS.CYBER] === 'available') {
        return DISTRICT_STATUS.AVAILABLE
      }
      if (overrides[DISTRICT_IDS.CYBER] === 'active') {
        return DISTRICT_STATUS.ACTIVE
      }
      // If player has already finished all 4 cyber missions
      if (completedMissions.length >= 4) {
        return DISTRICT_STATUS.COMPLETED
      }
      // If player has active score or responses recorded
      if (completedMissions.length > 0 || securityScore > 0 || correctResponses > 0) {
        return DISTRICT_STATUS.ACTIVE
      }
      // Default initial state: locked until authorized or progression unlocked
      return DISTRICT_STATUS.LOCKED
    }

    default:
      return DISTRICT_STATUS.AVAILABLE
  }
}

/**
 * Returns whether a district can be navigated to.
 * Locked districts cannot be entered.
 *
 * @param {string} status - One of DISTRICT_STATUS values
 * @returns {boolean}
 */
export function canEnterDistrict(status) {
  return status !== DISTRICT_STATUS.LOCKED
}

/**
 * Explains why a district is locked and how to unlock it.
 *
 * @param {string} districtId - The locked district
 * @returns {string} Descriptive reason
 */
export function getLockReason(districtId) {
  switch (districtId) {
    case DISTRICT_IDS.CYBER:
      return 'Security Clearance Level 1 required. Complete initial district operations or request access clearance.'
    case DISTRICT_IDS.DEVOPS:
      return 'Complete Cloud infrastructure verification to unlock automated pipeline highway.'
    default:
      return 'Restricted sector. Complete prerequisite missions to establish uplink.'
  }
}

/**
 * Calculates a summary of progression across all districts.
 *
 * @param {object} districtStatuses - Map of districtId -> status
 * @returns {object} { activeCount, totalCount, completedCount, availableCount }
 */
export function summarizeProgression(districtStatuses) {
  const values = Object.values(districtStatuses)
  const totalCount = values.length
  const activeCount = values.filter(
    (s) => s === DISTRICT_STATUS.ACTIVE || s === DISTRICT_STATUS.COMPLETED
  ).length
  const completedCount = values.filter((s) => s === DISTRICT_STATUS.COMPLETED).length
  const availableCount = values.filter((s) => s === DISTRICT_STATUS.AVAILABLE).length
  const lockedCount = values.filter((s) => s === DISTRICT_STATUS.LOCKED).length

  return {
    totalCount,
    activeCount,
    completedCount,
    availableCount,
    lockedCount,
  }
}
