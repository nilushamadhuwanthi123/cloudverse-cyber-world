import { useEffect, useRef, useState } from 'react'
import {
  LIFECYCLE,
  advanceThreat,
  resolveThreatResponse,
  spawnThreat,
} from '../../../game/threatEngine'
import { prefersReducedMotion } from '../../../lib/motion'
import SeverityBadge from './SeverityBadge'
import './ThreatPanel.css'

// Auto-advance delays for the stages before a player can respond. Long
// enough to read as "the system is doing something", short enough not
// to feel like a stall. Skipped entirely under reduced motion so the
// panel never leaves someone staring at a stage that will not move on
// its own for people who asked for less motion, not less function.
const DETECTED_DELAY_MS = 700
const ANALYZING_DELAY_MS = 900

const STAGE_LABEL = {
  [LIFECYCLE.DETECTED]: 'Detected',
  [LIFECYCLE.ANALYZING]: 'Analyzing',
  [LIFECYCLE.ACTIVE]: 'Active — response required',
  [LIFECYCLE.RESOLVED]: 'Resolved',
  [LIFECYCLE.ESCALATED]: 'Escalated',
}

/**
 * Threat Monitor: one threat at a time, walking Detected ->
 * Analyzing -> Active -> Player Response -> Resolved/Escalated.
 *
 * Threat generation, severity, and defense-action correctness all live
 * in game/threatEngine.js and game/threatTypes.js -- this component's
 * job is only to show the current stage and turn a click into a call
 * into that engine. Design (threat types, lifecycle, scoring) is
 * Kavindu's.
 */
export default function ThreatPanel({ worldHealth, onHealthChange, onScoreChange }) {
  const [threat, setThreat] = useState(() => spawnThreat(worldHealth))
  const timerRef = useRef(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  useEffect(() => {
    if (threat.stage !== LIFECYCLE.DETECTED && threat.stage !== LIFECYCLE.ANALYZING) {
      return undefined
    }

    const delay = threat.stage === LIFECYCLE.DETECTED ? DETECTED_DELAY_MS : ANALYZING_DELAY_MS
    const wait = prefersReducedMotion() ? 0 : delay

    timerRef.current = setTimeout(() => {
      setThreat((current) => advanceThreat(current))
    }, wait)

    return () => clearTimeout(timerRef.current)
  }, [threat.stage])

  function respond(actionId) {
    const { threat: resolved, healthDelta } = resolveThreatResponse(threat, actionId)
    setThreat(resolved)
    onHealthChange(healthDelta)
    // Severity travels with the outcome so the operations log can break
    // accuracy down by how hard the threat actually was.
    onScoreChange(resolved.resolution.correct, resolved.severity)
  }

  function nextThreat() {
    setThreat(spawnThreat(worldHealth))
  }

  const isDone = threat.stage === LIFECYCLE.RESOLVED || threat.stage === LIFECYCLE.ESCALATED
  const isWaiting = threat.stage === LIFECYCLE.DETECTED || threat.stage === LIFECYCLE.ANALYZING

  return (
    <div className="threat-panel">
      <div className="threat-panel__header">
        <SeverityBadge level={threat.severity} />
        <span className="threat-panel__stage">{STAGE_LABEL[threat.stage]}</span>
      </div>

      <h3 className="threat-panel__title">{threat.type.label}</h3>
      <p className="threat-panel__summary">{threat.type.summary}</p>

      {isWaiting && (
        <p className="threat-panel__waiting" role="status">
          {threat.stage === LIFECYCLE.DETECTED ? 'Logging detection details…' : 'Correlating with system state…'}
        </p>
      )}

      {threat.stage === LIFECYCLE.ACTIVE && (
        <div className="threat-panel__actions" role="group" aria-label="Choose a defense action">
          {threat.type.actions.map((action) => (
            <button
              key={action.id}
              type="button"
              className="threat-panel__action"
              onClick={() => respond(action.id)}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}

      {isDone && (
        <div
          className={`threat-panel__outcome threat-panel__outcome--${threat.resolution.correct ? 'correct' : 'wrong'}`}
          role="status"
        >
          <p className="threat-panel__outcome-verdict">
            {threat.resolution.correct
              ? `Correct — world health +5`
              : `Escalated — world health -10`}
          </p>
          <p className="threat-panel__outcome-explanation">{threat.resolution.explanation}</p>
          <button type="button" className="threat-panel__next" onClick={nextThreat}>
            Next threat
          </button>
        </div>
      )}
    </div>
  )
}
