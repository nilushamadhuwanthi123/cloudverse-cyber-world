/**
 * Network traffic rules.
 *
 * Two ideas carry this module.
 *
 * **Traffic responds to the world.** A district in good health with all
 * its defenses on sees mostly ordinary traffic. As health falls, or as
 * rules are switched off, the share of malicious packets rises. The
 * network is not a decorative animation running beside the game; it is
 * reading the same state everything else reads.
 *
 * **A false positive costs something.** Blocking legitimate traffic is
 * an outage you caused, and it is scored as one. A model where blocking
 * is free teaches the player to block everything, which is the opposite
 * of the judgement the exercise is for.
 *
 * Pure module: no DOM, no storage, and the randomness is injected, so a
 * test can pin every outcome.
 */
import { NETWORK_LINKS, NETWORK_NODES, TRAFFIC_PATTERNS } from '../data/networkTopology'
import { getProtectionCoverage } from './defenseRules'

export const PACKET_STATE = {
  NORMAL: 'normal',
  SUSPICIOUS: 'suspicious',
  MALICIOUS: 'malicious',
  BLOCKED: 'blocked',
  DELIVERED: 'delivered',
}

export const PACKET_ACTION = {
  ALLOW: 'allow',
  BLOCK: 'block',
}

/** Health effects. Getting it right is worth less than getting it wrong costs. */
export const PACKET_EFFECT = {
  CONTAINED: 3,
  MISSED: -8,
  FALSE_POSITIVE: -3,
  DELIVERED: 0,
}

/**
 * How likely the next packet is to be malicious, as a share of 1.
 *
 * Rises as world health falls and as the perimeter is left incomplete.
 * Clamped at both ends: a perfectly healthy district still sees the
 * occasional bad packet, and a collapsing one is never certain to.
 */
export function threatPressure({ worldHealth = 100, ruleStates = {} } = {}) {
  const health = Math.max(0, Math.min(100, worldHealth))
  const coverage = getProtectionCoverage(ruleStates)

  const fromHealth = ((100 - health) / 100) * 0.4
  const fromDefenses = ((100 - coverage) / 100) * 0.3

  return Math.min(0.85, Math.max(0.12, 0.12 + fromHealth + fromDefenses))
}

/** A node by id, or null. */
export function findNode(id) {
  return NETWORK_NODES.find((node) => node.id === id) ?? null
}

/** Whether the topology contains a direct link between two nodes. */
export function isLinked(fromId, toId) {
  return NETWORK_LINKS.some(
    (link) =>
      (link.from === fromId && link.to === toId) || (link.from === toId && link.to === fromId)
  )
}

/** The nodes directly linked to one node. */
function adjacent(id) {
  return NETWORK_LINKS.flatMap((link) => {
    if (link.from === id) return [link.to]
    if (link.to === id) return [link.from]
    return []
  })
}

/**
 * The shortest route between two nodes, as a list of node ids.
 *
 * A flow is not "off path" merely because its endpoints are not directly
 * linked -- a workstation reaching the app server crosses the gateway
 * and the firewall on the way, and that is exactly how it is supposed to
 * work. Claiming otherwise marked ordinary traffic as though it had
 * bypassed the perimeter, which is a reason to block it that the
 * evidence does not support.
 *
 * What is worth saying is the route itself, and whether one exists at
 * all. Returns an empty array when the endpoints are not connected.
 */
export function routeBetween(fromId, toId) {
  if (!findNode(fromId) || !findNode(toId)) return []
  if (fromId === toId) return [fromId]

  const queue = [[fromId]]
  const seen = new Set([fromId])

  while (queue.length > 0) {
    const path = queue.shift()
    const tail = path[path.length - 1]

    for (const next of adjacent(tail)) {
      if (seen.has(next)) continue
      if (next === toId) return [...path, next]

      seen.add(next)
      queue.push([...path, next])
    }
  }

  return []
}

/** Whether any route exists between two nodes. */
export function isReachable(fromId, toId) {
  return routeBetween(fromId, toId).length > 0
}

/**
 * The next packet to judge.
 *
 * A packet arrives as SUSPICIOUS whenever there is anything to notice
 * about it -- which includes ordinary traffic that happens to look odd.
 * The player learns what it actually is by inspecting it and weighing
 * the signals, not by reading the label.
 */
export function generatePacket(worldState = {}, rng = Math.random, sequence = 1) {
  const pressure = threatPressure(worldState)
  const wantMalicious = rng() < pressure

  const candidates = TRAFFIC_PATTERNS.filter((pattern) => pattern.malicious === wantMalicious)
  const pool = candidates.length > 0 ? candidates : TRAFFIC_PATTERNS
  const pattern = pool[Math.floor(rng() * pool.length) % pool.length]

  const notable = pattern.malicious || Boolean(pattern.looksOdd)

  return {
    id: `pkt-${sequence}`,
    patternId: pattern.id,
    from: pattern.from,
    to: pattern.to,
    protocol: pattern.protocol,
    port: pattern.port,
    summary: pattern.summary,
    signals: pattern.signals,
    looksOdd: pattern.looksOdd ?? null,
    // What the queue shows. Never the answer.
    state: notable ? PACKET_STATE.SUSPICIOUS : PACKET_STATE.NORMAL,
    // What it actually is. Only revealed once a decision is made.
    malicious: pattern.malicious,
    route: routeBetween(pattern.from, pattern.to),
  }
}

/**
 * The outcome of allowing or blocking a packet.
 *
 * All four cases are named, because three of them are ways to be wrong
 * and a player who only ever hears about the malicious ones will learn
 * to block everything.
 */
export function judgePacket(packet, action) {
  if (!packet) return { ok: false, reason: 'No packet selected.' }
  if (action !== PACKET_ACTION.ALLOW && action !== PACKET_ACTION.BLOCK) {
    return { ok: false, reason: 'A packet is either allowed or blocked.' }
  }

  const blocked = action === PACKET_ACTION.BLOCK

  if (packet.malicious && blocked) {
    return {
      ok: true,
      correct: true,
      state: PACKET_STATE.BLOCKED,
      healthDelta: PACKET_EFFECT.CONTAINED,
      verdict: 'Blocked — and it was malicious',
      explanation: `${packet.summary}. ${packet.signals[0]}. Stopping it at the perimeter is the cheapest place to stop it.`,
    }
  }

  if (packet.malicious && !blocked) {
    return {
      ok: true,
      correct: false,
      state: PACKET_STATE.DELIVERED,
      healthDelta: PACKET_EFFECT.MISSED,
      verdict: 'Allowed — and it was malicious',
      explanation: `${packet.summary}. ${packet.signals.join('; ')}. Every one of those was visible before the decision.`,
    }
  }

  if (!packet.malicious && blocked) {
    return {
      ok: true,
      correct: false,
      state: PACKET_STATE.BLOCKED,
      healthDelta: PACKET_EFFECT.FALSE_POSITIVE,
      verdict: 'Blocked — but it was legitimate',
      explanation: packet.looksOdd
        ? `${packet.summary}. ${packet.looksOdd} Unusual is not the same as malicious, and this outage is one you caused.`
        : `${packet.summary}. Nothing about it was out of place. Blocking working traffic is an outage you caused.`,
    }
  }

  return {
    ok: true,
    correct: true,
    state: PACKET_STATE.DELIVERED,
    healthDelta: PACKET_EFFECT.DELIVERED,
    verdict: 'Allowed — and it was legitimate',
    explanation: `${packet.summary}. Letting ordinary traffic through is the job working correctly, so nothing is gained and nothing is lost.`,
  }
}

/**
 * Running tally of decisions.
 *
 * False positives are counted in their own right rather than folded
 * into a single "wrong" figure -- blocking good traffic and missing bad
 * traffic are different failures with different fixes.
 */
export function tallyDecisions(decisions = []) {
  const blockedThreats = decisions.filter((d) => d.malicious && d.action === PACKET_ACTION.BLOCK)
  const missedThreats = decisions.filter((d) => d.malicious && d.action === PACKET_ACTION.ALLOW)
  const falsePositives = decisions.filter((d) => !d.malicious && d.action === PACKET_ACTION.BLOCK)
  const cleanPasses = decisions.filter((d) => !d.malicious && d.action === PACKET_ACTION.ALLOW)

  const correct = blockedThreats.length + cleanPasses.length

  return {
    total: decisions.length,
    blockedThreats: blockedThreats.length,
    missedThreats: missedThreats.length,
    falsePositives: falsePositives.length,
    cleanPasses: cleanPasses.length,
    accuracy: decisions.length === 0 ? 0 : Math.round((correct / decisions.length) * 100),
  }
}

/**
 * A queue of captured traffic, without repeats where it can avoid them.
 *
 * Drawing each packet independently produced queues holding the same
 * summary three times over, which reads as a rendering fault rather than
 * as traffic. Real captured traffic differs. Patterns already in the
 * queue are excluded until the pool runs out, at which point repeats are
 * allowed again rather than returning a short queue.
 */
export function generateQueue(worldState = {}, count = 4, rng = Math.random, from = 0) {
  const packets = []
  const used = new Set()

  for (let i = 0; i < count; i += 1) {
    let packet = null

    // A bounded number of attempts: with the pool exhausted, a repeat is
    // better than a queue with a hole in it.
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const candidate = generatePacket(worldState, rng, from + i + 1)
      if (!used.has(candidate.patternId)) {
        packet = candidate
        break
      }
      packet = candidate
    }

    used.add(packet.patternId)
    packets.push(packet)
  }

  return packets
}

/**
 * Every node a packet crosses, for lighting the route on the map.
 *
 * The endpoints alone were the earlier answer, and it was wrong: it lit
 * two nodes with nothing between them for traffic that in fact crosses
 * the gateway and the firewall.
 */
export function packetPath(packet) {
  if (!packet) return []
  if (Array.isArray(packet.route) && packet.route.length > 0) return packet.route
  return routeBetween(packet.from, packet.to)
}
