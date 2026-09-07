import { describe, expect, it } from 'vitest'
import {
  INITIAL_PROGRESS,
  MISSION_STATUS,
  isGoalMet,
  isUnlocked,
  missionsWithStatus,
  recordResponse,
  settleMissions,
  statusOf,
} from './missionState'
import { MISSIONS, findMission } from '../data/missions'

const statusById = (progress) =>
  Object.fromEntries(missionsWithStatus(progress).map(({ mission, status }) => [mission.id, status]))

describe('isUnlocked', () => {
  it('unlocks a mission with no requirements', () => {
    expect(isUnlocked(findMission('first-response'), [])).toBe(true)
  })

  it('keeps a mission locked until every requirement is complete', () => {
    const steadyHands = findMission('steady-hands')
    expect(isUnlocked(steadyHands, [])).toBe(false)
    expect(isUnlocked(steadyHands, ['first-response'])).toBe(true)
  })
})

describe('isGoalMet', () => {
  it('counts correct responses', () => {
    const goal = { type: 'correctResponses', count: 2 }
    expect(isGoalMet(goal, { ...INITIAL_PROGRESS, correctResponses: 1 })).toBe(false)
    expect(isGoalMet(goal, { ...INITIAL_PROGRESS, correctResponses: 2 })).toBe(true)
  })

  it('measures streak against the best streak reached, not the current one', () => {
    const goal = { type: 'streak', count: 3 }
    expect(isGoalMet(goal, { ...INITIAL_PROGRESS, bestStreak: 3 })).toBe(true)
  })

  it('requires both score and health for scoreWithHealth', () => {
    const goal = { type: 'scoreWithHealth', score: 50, minHealth: 60 }
    expect(isGoalMet(goal, { ...INITIAL_PROGRESS, securityScore: 50, worldHealth: 59 })).toBe(false)
    expect(isGoalMet(goal, { ...INITIAL_PROGRESS, securityScore: 49, worldHealth: 60 })).toBe(false)
    expect(isGoalMet(goal, { ...INITIAL_PROGRESS, securityScore: 50, worldHealth: 60 })).toBe(true)
  })

  it('returns false for a goal type it does not know', () => {
    expect(isGoalMet({ type: 'not-a-real-goal' }, INITIAL_PROGRESS)).toBe(false)
  })
})

describe('statusOf', () => {
  it('reports complete even when the mission would otherwise be locked', () => {
    const progress = { ...INITIAL_PROGRESS, completedMissionIds: ['hold-the-line'] }
    expect(statusOf(findMission('hold-the-line'), progress)).toBe(MISSION_STATUS.COMPLETE)
  })
})

describe('settleMissions', () => {
  it('completes nothing on a fresh run', () => {
    const { newlyCompleted, progress } = settleMissions(INITIAL_PROGRESS)
    expect(newlyCompleted).toEqual([])
    expect(progress.completedMissionIds).toEqual([])
  })

  it('does not complete a mission whose goal is met while its requirement is not', () => {
    // Streak goal satisfied, but first-response has never been completed.
    const cheating = { ...INITIAL_PROGRESS, bestStreak: 99 }
    const { progress } = settleMissions(cheating)

    expect(progress.completedMissionIds).not.toContain('steady-hands')
    expect(statusById(progress)['steady-hands']).toBe(MISSION_STATUS.LOCKED)
  })

  it('completes a whole chain in one call when every goal is already met', () => {
    const everything = {
      ...INITIAL_PROGRESS,
      correctResponses: 9,
      correctResponsesAllDefensesOn: 9,
      bestStreak: 9,
      securityScore: 99,
      worldHealth: 99,
    }

    const { newlyCompleted, progress } = settleMissions(everything)

    expect(newlyCompleted.map((mission) => mission.id)).toEqual(
      MISSIONS.map((mission) => mission.id)
    )
    expect(Object.values(statusById(progress))).toEqual(
      MISSIONS.map(() => MISSION_STATUS.COMPLETE)
    )
  })

  it('does not report an already-complete mission as newly complete', () => {
    const done = {
      ...INITIAL_PROGRESS,
      completedMissionIds: ['first-response'],
      correctResponses: 5,
    }

    const { newlyCompleted } = settleMissions(done)
    expect(newlyCompleted.map((mission) => mission.id)).not.toContain('first-response')
  })

  it('never mutates the progress it is given', () => {
    const before = { ...INITIAL_PROGRESS, correctResponses: 1 }
    const snapshot = JSON.parse(JSON.stringify(before))

    settleMissions(before)

    expect(before).toEqual(snapshot)
  })
})

describe('recordResponse', () => {
  it('counts a correct response and completes First Response', () => {
    const { progress, newlyCompleted } = recordResponse(INITIAL_PROGRESS, {
      correct: true,
      streak: 1,
      securityScore: 10,
      worldHealth: 100,
      allDefensesOn: true,
    })

    expect(progress.correctResponses).toBe(1)
    expect(newlyCompleted.map((mission) => mission.id)).toContain('first-response')
  })

  it('does not count a wrong response toward correct totals', () => {
    const { progress } = recordResponse(INITIAL_PROGRESS, {
      correct: false,
      streak: 0,
      securityScore: 0,
      worldHealth: 90,
      allDefensesOn: true,
    })

    expect(progress.correctResponses).toBe(0)
    expect(progress.correctResponsesAllDefensesOn).toBe(0)
    expect(progress.completedMissionIds).toEqual([])
  })

  it('only counts toward Full Perimeter when every defense was on', () => {
    const withDefenseOff = recordResponse(INITIAL_PROGRESS, {
      correct: true,
      streak: 1,
      securityScore: 10,
      worldHealth: 100,
      allDefensesOn: false,
    })

    expect(withDefenseOff.progress.correctResponses).toBe(1)
    expect(withDefenseOff.progress.correctResponsesAllDefensesOn).toBe(0)
  })

  it('keeps the best streak rather than the latest one', () => {
    const peaked = { ...INITIAL_PROGRESS, bestStreak: 5 }
    const { progress } = recordResponse(peaked, {
      correct: false,
      streak: 0,
      securityScore: 10,
      worldHealth: 80,
      allDefensesOn: true,
    })

    expect(progress.bestStreak).toBe(5)
  })

  it('leaves completed missions complete after a bad run', () => {
    const done = {
      ...INITIAL_PROGRESS,
      completedMissionIds: ['first-response', 'steady-hands'],
      correctResponses: 3,
      bestStreak: 3,
    }

    const { progress } = recordResponse(done, {
      correct: false,
      streak: 0,
      securityScore: 0,
      worldHealth: 5,
      allDefensesOn: false,
    })

    expect(progress.completedMissionIds).toEqual(
      expect.arrayContaining(['first-response', 'steady-hands'])
    )
  })
})
