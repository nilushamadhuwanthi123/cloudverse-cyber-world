import { describe, expect, it } from 'vitest'
import { INITIAL_SECURITY_SCORE_STATE, applyResponseToScore } from './securityScore'

const runResponses = (results) =>
  results.reduce((state, correct) => applyResponseToScore(state, correct), INITIAL_SECURITY_SCORE_STATE)

describe('applyResponseToScore', () => {
  it('starts at zero with no streak', () => {
    expect(INITIAL_SECURITY_SCORE_STATE).toEqual({ score: 0, streak: 0 })
  })

  it('awards the base points for a first correct response', () => {
    expect(applyResponseToScore(INITIAL_SECURITY_SCORE_STATE, true)).toEqual({ score: 10, streak: 1 })
  })

  it('grows the streak bonus as correct responses continue', () => {
    // 10, then 10+2, then 10+4 -- the bonus reflects the streak going in.
    expect(runResponses([true])).toEqual({ score: 10, streak: 1 })
    expect(runResponses([true, true])).toEqual({ score: 22, streak: 2 })
    expect(runResponses([true, true, true])).toEqual({ score: 36, streak: 3 })
  })

  it('caps the streak bonus so a long run does not dwarf the base points', () => {
    let state = INITIAL_SECURITY_SCORE_STATE
    for (let i = 0; i < 10; i += 1) state = applyResponseToScore(state, true)

    const beforeNext = state.score
    const capped = applyResponseToScore(state, true)

    // Base 10 plus the capped bonus of 10, never more.
    expect(capped.score - beforeNext).toBe(20)
  })

  it('subtracts points and resets the streak on a wrong response', () => {
    const afterStreak = runResponses([true, true, true])
    const afterMistake = applyResponseToScore(afterStreak, false)

    expect(afterMistake.score).toBe(afterStreak.score - 5)
    expect(afterMistake.streak).toBe(0)
  })

  it('rebuilds the bonus from scratch after a mistake', () => {
    const rebuilt = runResponses([true, true, true, false, true])
    // 36 - 5 = 31, then a fresh correct response with no streak bonus.
    expect(rebuilt).toEqual({ score: 41, streak: 1 })
  })

  it('never falls below zero', () => {
    expect(applyResponseToScore(INITIAL_SECURITY_SCORE_STATE, false)).toEqual({ score: 0, streak: 0 })
    expect(runResponses([false, false, false]).score).toBe(0)
  })

  it('does not mutate the state it is given', () => {
    const state = { score: 10, streak: 1 }
    applyResponseToScore(state, true)
    expect(state).toEqual({ score: 10, streak: 1 })
  })
})
