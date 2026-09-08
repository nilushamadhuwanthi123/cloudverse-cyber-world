import { describe, expect, it } from 'vitest'
import {
  buildTimeline,
  chainsIn,
  checkRootCause,
  correctRootCause,
  relatedEvidence,
  scoreSelection,
} from './evidenceCorrelation'
import { INCIDENT_CASES, findIncidentCase } from '../data/incidentCases'

const loginBurst = findIncidentCase('login-burst')
const relevantIds = (c) => c.evidence.filter((e) => e.relevant).map((e) => e.id)

describe('the case catalogue itself', () => {
  it('gives every case exactly one correct root cause', () => {
    for (const c of INCIDENT_CASES) {
      expect(c.rootCauseOptions.filter((o) => o.correct)).toHaveLength(1)
    }
  })

  it('gives every root cause option an explanation, so a wrong answer still teaches', () => {
    for (const c of INCIDENT_CASES) {
      for (const option of c.rootCauseOptions) {
        expect(option.explanation.length).toBeGreaterThan(0)
      }
    }
  })

  it('includes both relevant evidence and noise in every case', () => {
    for (const c of INCIDENT_CASES) {
      expect(c.evidence.some((e) => e.relevant)).toBe(true)
      expect(c.evidence.some((e) => !e.relevant)).toBe(true)
    }
  })

  it('gives relevant evidence a correlation id and noise none', () => {
    for (const c of INCIDENT_CASES) {
      for (const item of c.evidence) {
        if (item.relevant) expect(item.correlationId).toBeTruthy()
        else expect(item.correlationId).toBeNull()
      }
    }
  })
})

describe('buildTimeline', () => {
  it('orders evidence by when it happened, not the order it was written', () => {
    const timeline = buildTimeline(loginBurst.evidence)
    const minutes = timeline.map((e) => e.atMinute)

    expect(minutes).toEqual([...minutes].sort((a, b) => a - b))
  })

  it('does not mutate the evidence it is given', () => {
    const before = loginBurst.evidence.map((e) => e.id)
    buildTimeline(loginBurst.evidence)
    expect(loginBurst.evidence.map((e) => e.id)).toEqual(before)
  })
})

describe('relatedEvidence', () => {
  it('returns the chain in order', () => {
    const chain = relatedEvidence(loginBurst.evidence, 'chain-credential')

    expect(chain.map((e) => e.id)).toEqual(['lb-1', 'lb-2', 'lb-3'])
  })

  it('leaves out records that belong to no chain', () => {
    const chain = relatedEvidence(loginBurst.evidence, 'chain-credential')
    expect(chain.some((e) => e.correlationId === null)).toBe(false)
  })

  it('returns nothing for a missing or empty correlation id', () => {
    expect(relatedEvidence(loginBurst.evidence, null)).toEqual([])
    expect(relatedEvidence(loginBurst.evidence, 'no-such-chain')).toEqual([])
  })
})

describe('chainsIn', () => {
  it('finds each distinct chain once', () => {
    const chains = chainsIn(loginBurst.evidence)

    expect(chains).toHaveLength(1)
    expect(chains[0].correlationId).toBe('chain-credential')
    expect(chains[0].evidence).toHaveLength(3)
  })
})

describe('scoreSelection', () => {
  it('reports a perfect selection as complete', () => {
    const result = scoreSelection(loginBurst.evidence, relevantIds(loginBurst))

    expect(result.complete).toBe(true)
    expect(result.missed).toEqual([])
    expect(result.noise).toEqual([])
    expect(result.accuracy).toBe(1)
  })

  it('separates a missed clue from picked-up noise', () => {
    const result = scoreSelection(loginBurst.evidence, ['lb-1', 'lb-2', 'lb-4'])

    expect(result.found.map((e) => e.id)).toEqual(['lb-1', 'lb-2'])
    expect(result.missed.map((e) => e.id)).toEqual(['lb-3'])
    expect(result.noise.map((e) => e.id)).toEqual(['lb-4'])
    expect(result.complete).toBe(false)
  })

  it('is not complete when everything relevant is found but noise came too', () => {
    const result = scoreSelection(loginBurst.evidence, [...relevantIds(loginBurst), 'lb-5'])

    expect(result.missed).toEqual([])
    expect(result.accuracy).toBe(1)
    expect(result.complete).toBe(false)
  })

  it('handles selecting nothing', () => {
    const result = scoreSelection(loginBurst.evidence, [])

    expect(result.found).toEqual([])
    expect(result.missed).toHaveLength(3)
    expect(result.accuracy).toBe(0)
  })

  it('ignores ids that are not in the case', () => {
    const result = scoreSelection(loginBurst.evidence, ['not-real'])
    expect(result.noise).toEqual([])
  })
})

describe('checkRootCause', () => {
  it('accepts the supported answer and explains it', () => {
    const result = checkRootCause(loginBurst, 'compromised-credentials')

    expect(result.correct).toBe(true)
    expect(result.explanation).toContain('guessed into')
  })

  it('explains a wrong answer rather than only rejecting it', () => {
    const result = checkRootCause(loginBurst, 'traffic-spike')

    expect(result.ok).toBe(true)
    expect(result.correct).toBe(false)
    expect(result.explanation.length).toBeGreaterThan(0)
  })

  it('refuses an unknown option safely', () => {
    const result = checkRootCause(loginBurst, 'nonsense')

    expect(result.ok).toBe(false)
    expect(result.reason).toContain('Unknown option')
  })
})

describe('correctRootCause', () => {
  it('names the supported cause for every case', () => {
    for (const c of INCIDENT_CASES) {
      expect(correctRootCause(c).correct).toBe(true)
    }
  })
})
