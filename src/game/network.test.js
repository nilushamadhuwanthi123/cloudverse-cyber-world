import { describe, expect, it } from 'vitest'
import { NETWORK_LINKS, NETWORK_NODES, TRAFFIC_PATTERNS } from '../data/networkTopology'
import { getInitialRuleStates } from './defenseRules'
import {
  PACKET_ACTION,
  PACKET_EFFECT,
  PACKET_STATE,
  findNode,
  generatePacket,
  generateQueue,
  isLinked,
  isReachable,
  judgePacket,
  packetPath,
  routeBetween,
  tallyDecisions,
  threatPressure,
} from './network'

const ALL_ON = getInitialRuleStates()
const ALL_OFF = Object.fromEntries(Object.keys(ALL_ON).map((id) => [id, false]))

/** A deterministic stand-in for Math.random. */
const seq = (...values) => {
  let i = 0
  return () => values[Math.min(i++, values.length - 1)]
}

describe('the topology itself', () => {
  it('links only nodes that exist', () => {
    for (const link of NETWORK_LINKS) {
      expect(findNode(link.from), link.from).not.toBeNull()
      expect(findNode(link.to), link.to).not.toBeNull()
    }
  })

  it('keeps every address inside the ranges reserved for documentation', () => {
    for (const node of NETWORK_NODES) {
      expect(node.address).toMatch(/^(192\.0\.2\.|198\.51\.100\.|203\.0\.113\.)/)
    }
  })

  // Two overlapping cards make the top one swallow the clicks meant for
  // the one beneath -- the same defect the forensics board had.
  it('spaces the map nodes far enough apart to stay clickable', () => {
    const MIN_X = 26
    const MIN_Y = 26

    for (let i = 0; i < NETWORK_NODES.length; i += 1) {
      for (let j = i + 1; j < NETWORK_NODES.length; j += 1) {
        const a = NETWORK_NODES[i]
        const b = NETWORK_NODES[j]
        const clears = Math.abs(a.x - b.x) >= MIN_X || Math.abs(a.y - b.y) >= MIN_Y

        expect(clears, `${a.id} (${a.x},${a.y}) overlaps ${b.id} (${b.x},${b.y})`).toBe(true)
      }
    }
  })

  // A queue where everything unusual turns out to be malicious teaches
  // that blocking is free. At least one legitimate pattern must look odd.
  it('includes legitimate traffic that looks unusual', () => {
    const odd = TRAFFIC_PATTERNS.filter((pattern) => !pattern.malicious && pattern.looksOdd)
    expect(odd.length).toBeGreaterThan(0)
  })

  it('gives every pattern signals a player can actually weigh', () => {
    for (const pattern of TRAFFIC_PATTERNS) {
      expect(pattern.signals.length).toBeGreaterThan(1)
    }
  })
})

describe('threatPressure', () => {
  it('rises as world health falls', () => {
    const healthy = threatPressure({ worldHealth: 100, ruleStates: ALL_ON })
    const hurt = threatPressure({ worldHealth: 40, ruleStates: ALL_ON })

    expect(hurt).toBeGreaterThan(healthy)
  })

  it('rises as the perimeter is left incomplete', () => {
    const covered = threatPressure({ worldHealth: 100, ruleStates: ALL_ON })
    const exposed = threatPressure({ worldHealth: 100, ruleStates: ALL_OFF })

    expect(exposed).toBeGreaterThan(covered)
  })

  // Neither extreme is absolute: a healthy district still sees the
  // occasional bad packet, and a collapsing one is never certain to.
  it('stays inside its bounds at both extremes', () => {
    const best = threatPressure({ worldHealth: 100, ruleStates: ALL_ON })
    const worst = threatPressure({ worldHealth: 0, ruleStates: ALL_OFF })

    expect(best).toBeGreaterThanOrEqual(0.12)
    expect(worst).toBeLessThanOrEqual(0.85)
  })

  it('treats missing state as a healthy, fully covered district would', () => {
    expect(threatPressure()).toBeCloseTo(threatPressure({ worldHealth: 100, ruleStates: {} }))
  })
})

describe('generatePacket', () => {
  it('produces a malicious packet when the roll falls under the pressure', () => {
    const packet = generatePacket({ worldHealth: 100, ruleStates: ALL_ON }, seq(0.01, 0))
    expect(packet.malicious).toBe(true)
  })

  it('produces ordinary traffic when it does not', () => {
    const packet = generatePacket({ worldHealth: 100, ruleStates: ALL_ON }, seq(0.99, 0))
    expect(packet.malicious).toBe(false)
  })

  // The label is what the sensor saw, not the answer. Legitimate traffic
  // that looks odd must arrive marked SUSPICIOUS too, or the queue is
  // simply telling the player what to block.
  it('marks unusual-but-legitimate traffic as suspicious, same as a threat', () => {
    const odd = TRAFFIC_PATTERNS.filter((p) => !p.malicious && p.looksOdd)
    const plain = TRAFFIC_PATTERNS.filter((p) => !p.malicious && !p.looksOdd)
    const oddIndex = TRAFFIC_PATTERNS.filter((p) => !p.malicious).indexOf(odd[0])
    const benign = TRAFFIC_PATTERNS.filter((p) => !p.malicious)

    const oddPacket = generatePacket({}, seq(0.99, oddIndex / benign.length))
    expect(oddPacket.state).toBe(PACKET_STATE.SUSPICIOUS)
    expect(oddPacket.malicious).toBe(false)
    expect(plain.length).toBeGreaterThan(0)
  })

  it('carries the route its traffic would actually take', () => {
    const packet = generatePacket({ worldHealth: 100, ruleStates: ALL_ON }, seq(0.01, 0))
    expect(packet.route).toEqual(routeBetween(packet.from, packet.to))
  })

  it('gives each packet its own id', () => {
    const first = generatePacket({}, seq(0.5, 0), 1)
    const second = generatePacket({}, seq(0.5, 0), 2)
    expect(first.id).not.toBe(second.id)
  })
})

describe('generateQueue', () => {
  // Drawing each packet independently produced queues holding the same
  // summary three times over, which reads as a rendering fault rather
  // than as traffic.
  it('does not repeat a pattern while the pool still has others', () => {
    const queue = generateQueue({ worldHealth: 100, ruleStates: ALL_ON }, 4, Math.random)
    const patterns = queue.map((packet) => packet.patternId)

    expect(queue).toHaveLength(4)
    expect(new Set(patterns).size).toBe(4)
  })

  it('still fills the queue once the pool is exhausted, rather than returning a short one', () => {
    const queue = generateQueue({ worldHealth: 100, ruleStates: ALL_ON }, 12, Math.random)
    expect(queue).toHaveLength(12)
  })

  it('numbers packets from where the previous queue left off', () => {
    const queue = generateQueue({}, 3, Math.random, 10)
    expect(queue.map((packet) => packet.id)).toEqual(['pkt-11', 'pkt-12', 'pkt-13'])
  })
})

describe('judgePacket', () => {
  const malicious = { summary: 'Bad thing', signals: ['A', 'B'], malicious: true }
  const benign = { summary: 'Ordinary thing', signals: ['A', 'B'], malicious: false }
  const oddButFine = { ...benign, looksOdd: 'Six times the usual size.' }

  it('rewards blocking a threat, modestly', () => {
    const result = judgePacket(malicious, PACKET_ACTION.BLOCK)

    expect(result.correct).toBe(true)
    expect(result.state).toBe(PACKET_STATE.BLOCKED)
    expect(result.healthDelta).toBe(PACKET_EFFECT.CONTAINED)
  })

  it('punishes missing one much harder than it rewards catching one', () => {
    const caught = judgePacket(malicious, PACKET_ACTION.BLOCK)
    const missed = judgePacket(malicious, PACKET_ACTION.ALLOW)

    expect(missed.correct).toBe(false)
    expect(Math.abs(missed.healthDelta)).toBeGreaterThan(caught.healthDelta)
  })

  // A model where blocking is free teaches the player to block
  // everything, which is the opposite of the judgement being practised.
  it('charges for a false positive', () => {
    const result = judgePacket(benign, PACKET_ACTION.BLOCK)

    expect(result.correct).toBe(false)
    expect(result.healthDelta).toBe(PACKET_EFFECT.FALSE_POSITIVE)
    expect(result.explanation).toContain('outage you caused')
  })

  it('explains an odd-looking false positive in its own terms', () => {
    const result = judgePacket(oddButFine, PACKET_ACTION.BLOCK)
    expect(result.explanation).toContain('Six times the usual size')
    expect(result.explanation).toContain('Unusual is not the same as malicious')
  })

  it('gives nothing for letting ordinary traffic through', () => {
    const result = judgePacket(benign, PACKET_ACTION.ALLOW)

    expect(result.correct).toBe(true)
    expect(result.healthDelta).toBe(0)
  })

  it('lists every signal that was visible when a threat is missed', () => {
    const result = judgePacket(malicious, PACKET_ACTION.ALLOW)
    expect(result.explanation).toContain('A; B')
  })

  it('refuses an action that is neither allow nor block', () => {
    expect(judgePacket(malicious, 'maybe').ok).toBe(false)
    expect(judgePacket(null, PACKET_ACTION.BLOCK).ok).toBe(false)
  })
})

describe('tallyDecisions', () => {
  const decisions = [
    { malicious: true, action: PACKET_ACTION.BLOCK },
    { malicious: true, action: PACKET_ACTION.ALLOW },
    { malicious: false, action: PACKET_ACTION.BLOCK },
    { malicious: false, action: PACKET_ACTION.ALLOW },
  ]

  // Blocking good traffic and missing bad traffic are different failures
  // with different fixes, so one number cannot stand for both.
  it('counts the two kinds of mistake separately', () => {
    const tally = tallyDecisions(decisions)

    expect(tally.missedThreats).toBe(1)
    expect(tally.falsePositives).toBe(1)
    expect(tally.blockedThreats).toBe(1)
    expect(tally.cleanPasses).toBe(1)
    expect(tally.accuracy).toBe(50)
  })

  it('reads an empty shift as nothing judged rather than as failure', () => {
    expect(tallyDecisions([])).toMatchObject({ total: 0, accuracy: 0 })
  })
})

describe('routeBetween', () => {
  it('is the direct pair when the topology links them', () => {
    expect(routeBetween('gateway', 'firewall')).toEqual(['gateway', 'firewall'])
    expect(isLinked('gateway', 'firewall')).toBe(true)
  })

  // Endpoints that are not directly linked are not "off path": a
  // workstation reaching the app server crosses the gateway and the
  // firewall, which is exactly how it is meant to work. Treating that as
  // a bypass marked ordinary traffic as a reason to block.
  it('walks the hops between endpoints that are not directly linked', () => {
    const route = routeBetween('client-a', 'app-server')

    expect(route[0]).toBe('client-a')
    expect(route[route.length - 1]).toBe('app-server')
    expect(route).toContain('gateway')
    expect(route).toContain('firewall')
    expect(isLinked('client-a', 'app-server')).toBe(false)
  })

  it('finds a route between every pair of nodes in this topology', () => {
    for (const a of NETWORK_NODES) {
      for (const b of NETWORK_NODES) {
        expect(isReachable(a.id, b.id), `${a.id} -> ${b.id}`).toBe(true)
      }
    }
  })

  it('returns nothing for a node that is not in the topology', () => {
    expect(routeBetween('gateway', 'not-a-node')).toEqual([])
    expect(isReachable('gateway', 'not-a-node')).toBe(false)
  })
})

describe('packetPath', () => {
  it('lights every hop, not just the endpoints', () => {
    const packet = { from: 'client-a', to: 'app-server', route: routeBetween('client-a', 'app-server') }
    expect(packetPath(packet).length).toBeGreaterThan(2)
  })

  it('works out the route itself for a packet that has none stored', () => {
    expect(packetPath({ from: 'gateway', to: 'firewall' })).toEqual(['gateway', 'firewall'])
    expect(packetPath(null)).toEqual([])
  })
})
