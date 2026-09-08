import { describe, expect, it } from 'vitest'
import { FORENSIC_CASES } from '../data/forensicCases'
import {
  allLinks,
  areConnected,
  chainLinks,
  checkConclusion,
  correctConclusion,
  findArtifact,
  indicatorsOf,
  linkKey,
  neighbours,
  pickForensicCase,
  scoreInvestigation,
  sharedIndicators,
  traceConnection,
} from './forensics'

const [swapCase, tokenCase] = FORENSIC_CASES
const art = (id) => findArtifact(swapCase.artifacts, id)

describe('the case files themselves', () => {
  // The chain is the answer key. If a step of it is not supported by
  // shared indicators, the exercise is asking for a connection the
  // evidence does not contain -- an unwinnable case.
  it('has every chain step backed by a real shared indicator', () => {
    for (const forensicCase of FORENSIC_CASES) {
      const chain = forensicCase.chain
      expect(chainLinks(forensicCase)).toHaveLength(chain.length - 1)
    }
  })

  it('offers exactly one correct conclusion per case, each with an explanation', () => {
    for (const forensicCase of FORENSIC_CASES) {
      const correct = forensicCase.conclusionOptions.filter((option) => option.correct)
      expect(correct).toHaveLength(1)
      expect(forensicCase.conclusionOptions.every((option) => option.explanation.length > 40)).toBe(true)
    }
  })

  // A timeline with nothing innocent in it is not an exercise; telling
  // ordinary activity from the chain is the skill.
  it('includes at least one artefact that connects to nothing', () => {
    for (const forensicCase of FORENSIC_CASES) {
      const isolated = forensicCase.artifacts.filter(
        (artifact) => neighbours(forensicCase.artifacts, artifact.id).length === 0
      )
      expect(isolated.length).toBeGreaterThan(0)
    }
  })

  it('keeps every address inside the ranges reserved for documentation', () => {
    const addresses = FORENSIC_CASES.flatMap((forensicCase) =>
      forensicCase.artifacts.flatMap((artifact) =>
        indicatorsOf(artifact).filter((indicator) => indicator.startsWith('ip:'))
      )
    )

    expect(addresses.length).toBeGreaterThan(0)
    for (const address of addresses) {
      expect(address).toMatch(/^ip:(192\.0\.2\.|198\.51\.100\.|203\.0\.113\.)/)
    }
  })
})

describe('sharedIndicators', () => {
  it('returns what two records have in common, not merely that they do', () => {
    expect(sharedIndicators(art('session'), art('store-write'))).toEqual([
      'account:svc-deploy',
      'ip:198.51.100.23',
    ])
  })

  it('is empty for a record compared with itself', () => {
    expect(sharedIndicators(art('session'), art('session'))).toEqual([])
  })

  it('survives an artefact with no indicators at all', () => {
    expect(sharedIndicators(art('session'), { id: 'x' })).toEqual([])
    expect(sharedIndicators(null, art('session'))).toEqual([])
  })
})

describe('allLinks', () => {
  it('lists each pair once, never both directions', () => {
    const links = allLinks(swapCase.artifacts)
    const keys = links.map((link) => linkKey(link.from, link.to))

    expect(new Set(keys).size).toBe(keys.length)
  })

  it('leaves the unrelated record out entirely', () => {
    const links = allLinks(swapCase.artifacts)
    expect(links.some((link) => link.from === 'nightly-backup' || link.to === 'nightly-backup')).toBe(false)
  })
})

describe('traceConnection', () => {
  it('accepts a supported trace and says what supports it', () => {
    const result = traceConnection(swapCase, 'artifact-store', 'deploy')

    expect(result.ok).toBe(true)
    expect(result.via).toContain('hash:3d80be51fa17')
    expect(result.link.key).toBe(linkKey('artifact-store', 'deploy'))
  })

  // Refusing with the reason is the point: "these two share nothing" is
  // a finding, and silently ignoring the attempt teaches nothing.
  it('refuses an unsupported trace and explains why', () => {
    const result = traceConnection(swapCase, 'nightly-backup', 'deploy')

    expect(result.ok).toBe(false)
    expect(result.reason).toContain('share no address, account, object or hash')
  })

  it('refuses a record traced to itself, and one that is not in the case', () => {
    expect(traceConnection(swapCase, 'deploy', 'deploy').ok).toBe(false)
    expect(traceConnection(swapCase, 'deploy', 'not-a-record').ok).toBe(false)
  })
})

describe('scoreInvestigation', () => {
  const fullChain = chainLinks(swapCase)

  it('reports an untouched case as nothing found rather than as a failure', () => {
    const score = scoreInvestigation(swapCase, [], [])

    expect(score.onChain).toBe(0)
    expect(score.chainComplete).toBe(false)
    expect(score.missing).toEqual(fullChain)
  })

  it('recognises a complete chain', () => {
    const score = scoreInvestigation(swapCase, fullChain, swapCase.keyIndicators)

    expect(score.chainComplete).toBe(true)
    expect(score.indicatorsComplete).toBe(true)
    expect(score.missing).toEqual([])
  })

  // A real connection away from the chain is a legitimate observation.
  // Counting it against the player would teach them to stop looking.
  it('reports a supported off-chain trace separately, not as an error', () => {
    const offChain = linkKey('build-log', 'artifact-store')
    const score = scoreInvestigation(swapCase, [...fullChain, offChain], [])

    expect(score.chainComplete).toBe(true)
    expect(score.supportedOffChain).toBe(1)
  })

  it('does not let the same trace be counted twice', () => {
    const [first] = fullChain
    const score = scoreInvestigation(swapCase, [first, first, first], [])
    expect(score.onChain).toBe(1)
  })

  it('separates flagged indicators that matter from noise', () => {
    const score = scoreInvestigation(swapCase, [], ['ip:198.51.100.23', 'ip:192.0.2.10'])

    expect(score.correctFlags).toBe(1)
    expect(score.noiseFlags).toBe(1)
    expect(score.missedFlags).toEqual(['account:svc-deploy'])
  })
})

describe('checkConclusion', () => {
  it('accepts the supported conclusion and returns its reasoning', () => {
    const result = checkConclusion(swapCase, 'stored-copy-replaced')

    expect(result.correct).toBe(true)
    expect(result.explanation).toContain('a91f0c7e44b2')
  })

  it('explains a wrong conclusion instead of only rejecting it', () => {
    const result = checkConclusion(swapCase, 'backup-job')

    expect(result.correct).toBe(false)
    expect(result.explanation).toContain('svc-backup')
  })

  it('refuses an option that is not on the list', () => {
    expect(checkConclusion(swapCase, 'invented').ok).toBe(false)
  })

  it('can name the supported conclusion after a wrong one', () => {
    expect(correctConclusion(tokenCase).id).toBe('token-used-outside-binding')
  })
})

describe('pickForensicCase', () => {
  it('moves to a case not yet seen', () => {
    expect(pickForensicCase(FORENSIC_CASES, [swapCase.id]).id).toBe(tokenCase.id)
  })

  // Running out of cases must not leave the sector with nothing to open.
  it('starts again rather than returning nothing once all are seen', () => {
    expect(pickForensicCase(FORENSIC_CASES, FORENSIC_CASES.map((c) => c.id)).id).toBe(swapCase.id)
    expect(pickForensicCase([], [])).toBeNull()
  })
})

describe('areConnected and neighbours', () => {
  it('agree with each other', () => {
    const found = neighbours(swapCase.artifacts, 'session').map((artifact) => artifact.id)
    for (const artifact of swapCase.artifacts) {
      expect(found.includes(artifact.id)).toBe(areConnected(art('session'), artifact))
    }
  })
})

describe('board layout', () => {
  // Two overlapping cards do not merely look untidy: the one on top
  // swallows the clicks meant for the one underneath, which is how this
  // surfaced -- a trace that could not be completed because the target
  // was unreachable.
  it('keeps every pair of artefacts far enough apart to be clickable', () => {
    // Measured in a real browser: the board renders about 700px wide by
    // 512px tall and a card is 184px by up to 136px -- roughly 26% of
    // the width and 27% of the height. Two centres must clear one of
    // those margins, with a little to spare.
    const MIN_X = 30
    const MIN_Y = 28

    for (const forensicCase of FORENSIC_CASES) {
      for (let i = 0; i < forensicCase.artifacts.length; i += 1) {
        for (let j = i + 1; j < forensicCase.artifacts.length; j += 1) {
          const a = forensicCase.artifacts[i]
          const b = forensicCase.artifacts[j]
          const clears = Math.abs(a.x - b.x) >= MIN_X || Math.abs(a.y - b.y) >= MIN_Y

          expect(
            clears,
            `${forensicCase.caseId}: ${a.id} (${a.x},${a.y}) overlaps ${b.id} (${b.x},${b.y})`
          ).toBe(true)
        }
      }
    }
  })

  it('keeps every artefact inside the board', () => {
    for (const forensicCase of FORENSIC_CASES) {
      for (const artifact of forensicCase.artifacts) {
        expect(artifact.x).toBeGreaterThanOrEqual(10)
        expect(artifact.x).toBeLessThanOrEqual(90)
        expect(artifact.y).toBeGreaterThanOrEqual(5)
        expect(artifact.y).toBeLessThanOrEqual(95)
      }
    }
  })
})
