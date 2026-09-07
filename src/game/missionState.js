/**
 * Mission state and unlock order.
 *
 * The rules half of missions: given the definitions in data/missions.js
 * and a snapshot of what the player has done, decide which missions are
 * locked, available, or complete.
 *
 * Framework-free on purpose (architecture doc: game/ holds rules, no
 * JSX, no DOM, no localStorage). Persistence is services/ + storage/,
 * one layer down, and this file never reaches for it directly.
 */
import { MISSIONS, findMission } from '../data/missions'

export const MISSION_STATUS = {
  LOCKED: 'locked',
  AVAILABLE: 'available',
  COMPLETE: 'complete',
}

/**
 * The counters missions are judged against.
 *
 * Kept deliberately small: every field here is something a district
 * already produces during normal play, so no panel has to track extra
 * bookkeeping just to satisfy a mission.
 */
export const INITIAL_PROGRESS = {
  completedMissionIds: [],
  correctResponses: 0,
  correctResponsesAllDefensesOn: 0,
  bestStreak: 0,
  securityScore: 0,
  worldHealth: 100,
}

/** A mission is unlocked once every mission it requires is complete. */
export function isUnlocked(mission, completedMissionIds) {
  return mission.requires.every((requiredId) => completedMissionIds.includes(requiredId))
}

/**
 * Has this mission's goal been met by the current progress?
 *
 * Each goal type reads one or two counters and nothing else -- a goal
 * that needed the whole app's state would be a sign the rule belongs
 * in the district, not here.
 */
export function isGoalMet(goal, progress) {
  switch (goal.type) {
    case 'correctResponses':
      return progress.correctResponses >= goal.count
    case 'streak':
      return progress.bestStreak >= goal.count
    case 'scoreWithHealth':
      return progress.securityScore >= goal.score && progress.worldHealth >= goal.minHealth
    case 'correctResponsesAllDefensesOn':
      return progress.correctResponsesAllDefensesOn >= goal.count
    default:
      return false
  }
}

/** Status of one mission: complete wins, then unlocked, else locked. */
export function statusOf(mission, progress) {
  if (progress.completedMissionIds.includes(mission.id)) return MISSION_STATUS.COMPLETE
  if (!isUnlocked(mission, progress.completedMissionIds)) return MISSION_STATUS.LOCKED
  return MISSION_STATUS.AVAILABLE
}

/** Every mission paired with its current status, in definition order. */
export function missionsWithStatus(progress) {
  return MISSIONS.map((mission) => ({ mission, status: statusOf(mission, progress) }))
}

/**
 * Recomputes which missions are newly complete for the given progress.
 *
 * Returns the updated progress plus the missions that just completed,
 * so a caller can show "mission complete" for exactly those. Only
 * unlocked missions can complete -- meeting a locked mission's goal
 * early does not skip the order, it just completes as soon as its
 * requirements land.
 *
 * Runs to a fixed point so finishing one mission can immediately
 * complete another it unlocks, without needing a second call.
 */
export function settleMissions(progress) {
  let completedMissionIds = [...progress.completedMissionIds]
  const newlyCompleted = []

  let changed = true
  while (changed) {
    changed = false
    for (const mission of MISSIONS) {
      if (completedMissionIds.includes(mission.id)) continue
      if (!isUnlocked(mission, completedMissionIds)) continue
      if (!isGoalMet(mission.goal, { ...progress, completedMissionIds })) continue

      completedMissionIds = [...completedMissionIds, mission.id]
      newlyCompleted.push(mission)
      changed = true
    }
  }

  return {
    progress: { ...progress, completedMissionIds },
    newlyCompleted,
  }
}

/**
 * Folds one resolved threat response into progress, then settles
 * missions against the result.
 *
 * `allDefensesOn` is passed in rather than read from anywhere because
 * defense rules are the Defense Status panel's state, and this layer
 * does not reach up into components to find it.
 */
export function recordResponse(progress, { correct, streak, securityScore, worldHealth, allDefensesOn }) {
  const advanced = {
    ...progress,
    correctResponses: progress.correctResponses + (correct ? 1 : 0),
    correctResponsesAllDefensesOn:
      progress.correctResponsesAllDefensesOn + (correct && allDefensesOn ? 1 : 0),
    bestStreak: Math.max(progress.bestStreak, streak),
    securityScore,
    worldHealth,
  }

  return settleMissions(advanced)
}

export { findMission }
