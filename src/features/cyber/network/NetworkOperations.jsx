import React, { useState } from 'react'
import { NETWORK_LINKS, NETWORK_NODES } from '../../../data/networkTopology'
import {
  PACKET_ACTION,
  PACKET_STATE,
  findNode,
  generateQueue,
  judgePacket,
  packetPath,
  tallyDecisions,
  threatPressure,
} from '../../../game/network'
import './NetworkOperations.css'

const STATE_LABEL = {
  [PACKET_STATE.NORMAL]: 'NORMAL',
  [PACKET_STATE.SUSPICIOUS]: 'SUSPICIOUS',
  [PACKET_STATE.MALICIOUS]: 'MALICIOUS',
  [PACKET_STATE.BLOCKED]: 'BLOCKED',
  [PACKET_STATE.DELIVERED]: 'DELIVERED',
}

const KIND_LABEL = {
  client: 'CLIENT',
  gateway: 'GATEWAY',
  firewall: 'FIREWALL',
  server: 'SERVER',
  database: 'DATABASE',
  collector: 'COLLECTOR',
}

const QUEUE_SIZE = 4

/**
 * Network Operations.
 *
 * The map is the district's real topology, and the queue is traffic
 * crossing it. What arrives depends on the world: a healthy district
 * with its perimeter intact sees mostly ordinary traffic, and the share
 * of malicious packets climbs as health falls or rules are switched off.
 * The reading is shown, so the player can see the connection rather than
 * being told about it.
 *
 * The queue never says which packets are actually bad. It says which
 * ones a sensor found notable -- and legitimate traffic that looks odd
 * is in there too. The judgement is the exercise; a label that gave the
 * answer away would remove it.
 *
 * Same discipline as the forensics board: nodes are real buttons, the
 * SVG that joins them is aria-hidden decoration, and below the board
 * breakpoint the map becomes a list without losing anything.
 */
export default function NetworkOperations({ worldHealth, ruleStates, onHealthChange, onDecision }) {
  const worldState = { worldHealth, ruleStates }

  const [queue, setQueue] = useState(() => generateQueue(worldState, QUEUE_SIZE))
  const [issued, setIssued] = useState(QUEUE_SIZE)
  const [selectedPacketId, setSelectedPacketId] = useState(null)
  const [selectedNodeId, setSelectedNodeId] = useState(null)
  const [decisions, setDecisions] = useState([])
  const [outcome, setOutcome] = useState(null)
  const [notice, setNotice] = useState('')

  const selectedPacket = queue.find((packet) => packet.id === selectedPacketId) ?? null
  const selectedNode = selectedNodeId ? findNode(selectedNodeId) : null
  const tally = tallyDecisions(decisions)
  const pressure = Math.round(threatPressure(worldState) * 100)
  // Every node the packet crosses, not just its endpoints -- a
  // workstation reaching the app server goes through the gateway and the
  // firewall, and the map should show that.
  const litPath = packetPath(selectedPacket)

  function inspectPacket(id) {
    setSelectedPacketId(id)
    setSelectedNodeId(null)
    setOutcome(null)
    const packet = queue.find((candidate) => candidate.id === id)
    setNotice(packet ? `Inspecting ${packet.summary}.` : '')
  }

  function inspectNode(id) {
    setSelectedNodeId(id)
    const node = findNode(id)
    setNotice(node ? `${node.label} — ${node.address}.` : '')
  }

  function decide(action) {
    const packet = selectedPacket
    const result = judgePacket(packet, action)
    if (!result.ok) return

    onHealthChange?.(result.healthDelta)
    onDecision?.({
      packetId: packet.id,
      action,
      malicious: packet.malicious,
      correct: result.correct,
    })

    setDecisions((current) => [...current, { malicious: packet.malicious, action }])
    setOutcome({ ...result, packet })
    setQueue((current) => current.filter((candidate) => candidate.id !== packet.id))
    setSelectedPacketId(null)
    setNotice(result.verdict)
  }

  function refillQueue() {
    setQueue(generateQueue(worldState, QUEUE_SIZE, Math.random, issued))
    setIssued((current) => current + QUEUE_SIZE)
    setSelectedPacketId(null)
    setOutcome(null)
    setNotice('New traffic captured.')
  }

  return (
    <div className="netops">
      <p className="netops__live" role="status" aria-live="polite">
        {notice}
      </p>

      <div className="netops__readouts">
        <span>
          Threat pressure: <strong>{pressure}%</strong>
          <span className="netops__readout-note">
            {' '}from world health {worldHealth} and the current perimeter
          </span>
        </span>
        <span>
          Judged: <strong>{tally.total}</strong> · accuracy <strong>{tally.accuracy}%</strong>
        </span>
        <span>
          Threats blocked <strong>{tally.blockedThreats}</strong> · missed{' '}
          <strong>{tally.missedThreats}</strong> · false positives{' '}
          <strong>{tally.falsePositives}</strong>
        </span>
      </div>

      <div className="netops__map">
        {/* Decoration: every link is also stated in the node inspector. */}
        <svg
          className="netops__links"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {NETWORK_LINKS.map((link) => {
            const from = findNode(link.from)
            const to = findNode(link.to)
            if (!from || !to) return null

            const lit = litPath.includes(link.from) && litPath.includes(link.to)
            return (
              <line
                key={`${link.from}-${link.to}`}
                className={`netops__link ${lit ? 'netops__link--lit' : ''}`}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
              />
            )
          })}
        </svg>

        <ul className="netops__nodes">
          {NETWORK_NODES.map((node) => {
            const onPath = litPath.includes(node.id)

            return (
              <li
                key={node.id}
                className="netops__node-slot"
                style={{ '--node-x': `${node.x}%`, '--node-y': `${node.y}%` }}
              >
                <button
                  type="button"
                  className={`netops__node netops__node--${node.kind} ${
                    node.id === selectedNodeId ? 'netops__node--selected' : ''
                  } ${onPath ? 'netops__node--on-path' : ''}`}
                  aria-pressed={node.id === selectedNodeId}
                  onClick={() => inspectNode(node.id)}
                >
                  <span className="netops__node-kind">{KIND_LABEL[node.kind]}</span>
                  <span className="netops__node-label">{node.label}</span>
                  <span className="netops__node-address">{node.address}</span>
                  {onPath && <span className="netops__node-flag">on this path</span>}
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      {selectedNode && (
        <section className="netops__panel" aria-labelledby="netops-node-heading">
          <h3 id="netops-node-heading" className="netops__panel-title">
            {selectedNode.label}
          </h3>
          <p className="netops__panel-note">{selectedNode.role}</p>
          <dl className="netops__fields">
            <div className="netops__field">
              <dt>Address</dt>
              <dd>{selectedNode.address}</dd>
            </div>
            <div className="netops__field">
              <dt>Connects to</dt>
              <dd>
                {NETWORK_LINKS.filter(
                  (link) => link.from === selectedNode.id || link.to === selectedNode.id
                )
                  .map((link) =>
                    findNode(link.from === selectedNode.id ? link.to : link.from)?.label
                  )
                  .join(', ') || 'nothing'}
              </dd>
            </div>
          </dl>
        </section>
      )}

      <section className="netops__panel" aria-labelledby="netops-queue-heading">
        <h3 id="netops-queue-heading" className="netops__panel-title">
          Captured traffic
        </h3>
        <p className="netops__panel-note">
          The sensor marks what is notable, not what is malicious. Unusual and
          legitimate looks the same here as unusual and hostile.
        </p>

        {queue.length === 0 ? (
          <>
            <p className="netops__empty">QUEUE CLEAR — every captured packet judged.</p>
            <button type="button" className="netops__action" onClick={refillQueue}>
              Capture more traffic
            </button>
          </>
        ) : (
          <ul className="netops__queue">
            {queue.map((packet) => (
              <li key={packet.id}>
                <button
                  type="button"
                  className={`netops__packet netops__packet--${packet.state} ${
                    packet.id === selectedPacketId ? 'netops__packet--selected' : ''
                  }`}
                  aria-pressed={packet.id === selectedPacketId}
                  onClick={() => inspectPacket(packet.id)}
                >
                  <span className="netops__packet-state">{STATE_LABEL[packet.state]}</span>
                  <span className="netops__packet-body">
                    <span className="netops__packet-summary">{packet.summary}</span>
                    <span className="netops__packet-route">
                      {findNode(packet.from)?.label} → {findNode(packet.to)?.label} ·{' '}
                      {packet.protocol}
                      {packet.port ? `/${packet.port}` : ''}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {selectedPacket && (
        <section className="netops__panel" aria-labelledby="netops-packet-heading">
          <h3 id="netops-packet-heading" className="netops__panel-title">
            {selectedPacket.summary}
          </h3>
          <p className="netops__panel-note">
            {selectedPacket.route.length > 0
              ? `Route: ${selectedPacket.route.map((id) => findNode(id)?.label).join(' → ')}`
              : `${findNode(selectedPacket.from)?.label} → ${findNode(selectedPacket.to)?.label} — the topology contains no route between these two at all.`}
          </p>

          <ul className="netops__signals">
            {selectedPacket.signals.map((signal) => (
              <li key={signal} className="netops__signal">
                {signal}
              </li>
            ))}
          </ul>

          <div className="netops__decision">
            <button
              type="button"
              className="netops__action netops__action--block"
              onClick={() => decide(PACKET_ACTION.BLOCK)}
            >
              Block
            </button>
            <button
              type="button"
              className="netops__action netops__action--allow"
              onClick={() => decide(PACKET_ACTION.ALLOW)}
            >
              Allow
            </button>
          </div>
        </section>
      )}

      {outcome && (
        <section
          className={`netops__outcome netops__outcome--${outcome.correct ? 'correct' : 'wrong'}`}
          aria-labelledby="netops-outcome-heading"
        >
          <h3 id="netops-outcome-heading" className="netops__outcome-verdict">
            {outcome.verdict}
          </h3>
          <p className="netops__outcome-explanation">{outcome.explanation}</p>
          <p className="netops__outcome-health">
            World health {outcome.healthDelta === 0 ? 'unchanged' : `${outcome.healthDelta > 0 ? '+' : ''}${outcome.healthDelta}`}
          </p>
        </section>
      )}
    </div>
  )
}
