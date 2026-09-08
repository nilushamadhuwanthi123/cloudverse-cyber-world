import { describe, expect, it } from 'vitest'
import { FORENSIC_CASES } from '../data/forensicCases'
import { ATTACK_PATTERNS, CAMPAIGNS, KNOWN_INDICATORS, THREAT_ACTORS } from '../data/threatIntel'
import { forensicsClosedEvent, threatResponseEvent } from './securityEvents'
import {
  actorsFor,
  campaignsFor,
  correlate,
  findActor,
  indicatorBoard,
  patternsForActor,
  readIndicator,
  sightingsFromEvents,
} from './threatIntel'

const at = (ms) => ({ now: () => ms, id: `e-${ms}` })

describe('the intelligence data itself', () => {
  // The whole sector rests on sharing an indicator vocabulary with the
  // forensic cases. If the two drift, correlation silently returns
  // nothing and the screen looks broken for no visible reason.
  it('shares indicator strings with the forensic case files', () => {
    const caseIndicators = new Set(FORENSIC_CASES.flatMap((forensicCase) => forensicCase.keyIndicators))
    const shared = KNOWN_INDICATORS.filter((indicator) => caseIndicators.has(indicator))

    expect(shared.length).toBeGreaterThanOrEqual(caseIndicators.size)
  })

  it('attributes every campaign to an actor that exists', () => {
    for (const campaign of CAMPAIGNS) {
      expect(findActor(campaign.actorId), campaign.id).not.toBeNull()
    }
  })

  it('references only patterns that exist', () => {
    const ids = new Set(ATTACK_PATTERNS.map((pattern) => pattern.id))
    for (const actor of THREAT_ACTORS) {
      for (const patternId of actor.patternIds) {
        expect(ids.has(patternId), `${actor.id} -> ${patternId}`).toBe(true)
      }
    }
  })

  it('names only case files this build actually has', () => {
    const caseIds = new Set(FORENSIC_CASES.map((forensicCase) => forensicCase.caseId))
    for (const campaign of CAMPAIGNS) {
      for (const caseId of campaign.relatedCaseIds) {
        expect(caseIds.has(caseId), `${campaign.id} -> ${caseId}`).toBe(true)
      }
    }
  })

  it('keeps every address inside the ranges reserved for documentation', () => {
    const addresses = KNOWN_INDICATORS.filter((indicator) => indicator.startsWith('ip:'))
    expect(addresses.length).toBeGreaterThan(0)
    for (const address of addresses) {
      expect(address).toMatch(/^ip:(192\.0\.2\.|198\.51\.100\.|203\.0\.113\.)/)
    }
  })
})

describe('correlate', () => {
  it('walks indicator to actor to campaign to patterns', () => {
    const chain = correlate('ip:198.51.100.23')

    expect(chain.known).toBe(true)
    expect(chain.actors.map((actor) => actor.codename)).toContain('PALE LEDGER')
    expect(chain.campaigns.map((campaign) => campaign.name)).toContain('STILLWATER')
    expect(chain.patterns.map((pattern) => pattern.id)).toContain('artifact-substitution')
  })

  it('lists each pattern once when two actors share one', () => {
    const chain = correlate('ip:203.0.113.77')
    const ids = chain.patterns.map((pattern) => pattern.id)

    expect(new Set(ids).size).toBe(ids.length)
  })

  // An indicator nobody has anything on must be a state the screen can
  // render, not a missing branch that throws.
  it('reports an unknown indicator as unknown rather than failing', () => {
    const chain = correlate('ip:192.0.2.222')

    expect(chain.known).toBe(false)
    expect(chain.actors).toEqual([])
    expect(chain.campaigns).toEqual([])
    expect(chain.patterns).toEqual([])
  })

  it('survives being handed nothing', () => {
    expect(correlate(null).known).toBe(false)
    expect(actorsFor(undefined)).toEqual([])
    expect(campaignsFor(undefined)).toEqual([])
    expect(patternsForActor(null)).toEqual([])
  })
})

describe('sightingsFromEvents', () => {
  it('reads what the player flagged out of the event log', () => {
    const log = [
      forensicsClosedEvent(
        { caseId: 'DF-001', correct: true, indicators: ['ip:198.51.100.23', 'account:svc-deploy'] },
        at(1000)
      ),
    ]

    const sightings = sightingsFromEvents(log)
    expect([...sightings.keys()]).toEqual(['ip:198.51.100.23', 'account:svc-deploy'])
    expect(sightings.get('ip:198.51.100.23')).toEqual(['DF-001'])
  })

  it('records every case an indicator turned up in, without repeating one', () => {
    const log = [
      forensicsClosedEvent({ caseId: 'DF-001', indicators: ['ip:198.51.100.23'] }, at(1000)),
      forensicsClosedEvent({ caseId: 'DF-001', indicators: ['ip:198.51.100.23'] }, at(2000)),
      forensicsClosedEvent({ caseId: 'DF-002', indicators: ['ip:198.51.100.23'] }, at(3000)),
    ]

    expect(sightingsFromEvents(log).get('ip:198.51.100.23')).toEqual(['DF-001', 'DF-002'])
  })

  it('ignores events of every other kind', () => {
    const log = [threatResponseEvent({ severity: 'low', correct: true }, at(1000))]
    expect(sightingsFromEvents(log).size).toBe(0)
    expect(sightingsFromEvents([]).size).toBe(0)
  })

  it('tolerates a closed case that flagged nothing', () => {
    const log = [forensicsClosedEvent({ caseId: 'DF-001', correct: false }, at(1000))]
    expect(sightingsFromEvents(log).size).toBe(0)
  })
})

describe('indicatorBoard', () => {
  it('marks nothing as seen for a run that has not investigated', () => {
    const board = indicatorBoard([])

    expect(board).toHaveLength(KNOWN_INDICATORS.length)
    expect(board.every((item) => item.seen === false)).toBe(true)
  })

  // The part of this screen that is about the player comes first.
  it('sorts what the player found ahead of the catalogue', () => {
    const log = [forensicsClosedEvent({ caseId: 'DF-002', indicators: ['token:tok_7Q'] }, at(1000))]
    const board = indicatorBoard(log)

    expect(board[0].indicator).toBe('token:tok_7Q')
    expect(board[0].seen).toBe(true)
    expect(board[0].caseIds).toEqual(['DF-002'])
  })

  // "You found something we have nothing on" is a real result. Dropping
  // it would quietly tell the player their find did not count.
  it('keeps a flagged indicator the sector knows nothing about', () => {
    const log = [
      forensicsClosedEvent({ caseId: 'DF-001', indicators: ['ip:192.0.2.222'] }, at(1000)),
    ]
    const board = indicatorBoard(log)
    const found = board.find((item) => item.indicator === 'ip:192.0.2.222')

    expect(found).toBeDefined()
    expect(found.seen).toBe(true)
    expect(found.known).toBe(false)
  })
})

describe('readIndicator', () => {
  it('splits a prefixed indicator into its kind and value', () => {
    expect(readIndicator('ip:198.51.100.23')).toEqual({ kind: 'ip', value: '198.51.100.23' })
    expect(readIndicator('account:svc-deploy')).toEqual({ kind: 'account', value: 'svc-deploy' })
  })

  it('handles one with no prefix, and nothing at all', () => {
    expect(readIndicator('bare')).toEqual({ kind: 'indicator', value: 'bare' })
    expect(readIndicator(null)).toEqual({ kind: 'indicator', value: '' })
  })
})
