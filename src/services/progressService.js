/**
 * The seam between the app and where data comes from.
 *
 * Every function here is async even though nothing it does needs to be
 * yet. That is the point: the day these become fetch() calls against a
 * real backend, their signatures do not change and no component is
 * rewritten. A component that awaited loadProgress() keeps awaiting it.
 *
 * Components call these. Components never import data/ or storage/
 * directly -- that single restriction is what keeps the swap cheap.
 */
import { MISSION_LIST } from '../data/missions'
import { INITIAL_PROGRESS } from '../game/missionState'
import { STORAGE_KEYS, clearAll, readJSON, writeJSON } from '../storage/localStore'

/**
 * Merges a stored payload onto the current defaults.
 *
 * A build that adds a counter must not break on progress saved by an
 * older build that never wrote it, so unknown-shaped input degrades to
 * defaults field by field instead of being thrown away wholesale.
 */
function reconcile(stored) {
  if (!stored || typeof stored !== 'object') return INITIAL_PROGRESS

  const completedMissionIds = Array.isArray(stored.completedMissionIds)
    ? stored.completedMissionIds.filter((id) => MISSION_LIST.some((mission) => mission.id === id))
    : INITIAL_PROGRESS.completedMissionIds

  const number = (value, fallback) => (typeof value === 'number' && Number.isFinite(value) ? value : fallback)

  return {
    completedMissionIds,
    correctResponses: number(stored.correctResponses, INITIAL_PROGRESS.correctResponses),
    correctResponsesAllDefensesOn: number(
      stored.correctResponsesAllDefensesOn,
      INITIAL_PROGRESS.correctResponsesAllDefensesOn
    ),
    bestStreak: number(stored.bestStreak, INITIAL_PROGRESS.bestStreak),
    securityScore: number(stored.securityScore, INITIAL_PROGRESS.securityScore),
    worldHealth: number(stored.worldHealth, INITIAL_PROGRESS.worldHealth),
  }
}

/** Loads saved progress, falling back to a fresh run. */
export async function loadProgress() {
  return reconcile(readJSON(STORAGE_KEYS.PROGRESS, null))
}

/**
 * Saves progress.
 *
 * Resolves to whether it persisted, so a caller can distinguish a saved
 * session from one running without persistence rather than assuming.
 */
export async function saveProgress(progress) {
  return writeJSON(STORAGE_KEYS.PROGRESS, progress)
}

/** Mission definitions. Reads from data/ today, an endpoint later. */
export async function loadMissions() {
  return MISSION_LIST
}

/** Reset progress -- clears only the keys this app owns. */
export async function resetProgress() {
  return clearAll()
}
