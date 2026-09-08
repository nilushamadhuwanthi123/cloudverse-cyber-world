import { useEffect, useMemo, useRef, useState } from 'react'
import {
  INCIDENT_STATE,
  openIncident,
  pickIncidentCase,
  responseTimeline,
  transitionIncident,
} from '../../../game/incidentResponse'
import {
  buildTimeline,
  checkRootCause,
  correctRootCause,
  scoreSelection,
} from '../../../game/evidenceCorrelation'
import { applyContainment, CONTAINMENT_ACTIONS } from '../../../game/containment'
import { INCIDENT_CASES } from '../../../data/incidentCases'
import { motion, prefersReducedMotion, stopMotion } from '../../../lib/motion'
import SeverityBadge from './SeverityBadge'
import './IncidentPanel.css'

/**
 * Incident Command — the investigation the player actually works through.
 *
 * Every rule this reads lives in game/: the lifecycle and which stage may
 * follow which, whether a selection of evidence was right, whether a root
 * cause is supported, and what a containment action costs. This component
 * decides nothing; it shows the current stage and turns a click into a
 * call into those engines.
 *
 * The stages are gated on purpose. The containment choices do not appear
 * until a root cause has been named, because choosing a response before
 * you know what happened is the mistake the exercise exists to prevent.
 *
 * Every incident, log line and system named here is fictional content
 * from data/incidentCases.js (spec 52).
 */

const STAGE_LABEL = {
  [INCIDENT_STATE.DETECTED]: 'Detected',
  [INCIDENT_STATE.INVESTIGATING]: 'Investigating',
  [INCIDENT_STATE.CONTAINED]: 'Contained',
  [INCIDENT_STATE.ERADICATION]: 'Eradication',
  [INCIDENT_STATE.RECOVERY]: 'Recovery',
  [INCIDENT_STATE.VERIFICATION]: 'Verification',
  [INCIDENT_STATE.RESOLVED]: 'Resolved',
  [INCIDENT_STATE.ESCALATED]: 'Escalated',
}

const STAGE_ORDER = [
  INCIDENT_STATE.DETECTED,
  INCIDENT_STATE.INVESTIGATING,
  INCIDENT_STATE.CONTAINED,
  INCIDENT_STATE.ERADICATION,
  INCIDENT_STATE.RECOVERY,
  INCIDENT_STATE.VERIFICATION,
  INCIDENT_STATE.RESOLVED,
]

/** Whole seconds an incident was open, from its own recorded history. */
function elapsedSeconds(incident) {
  return Math.round(responseTimeline(incident).totalMs / 1000)
}

export default function IncidentPanel({
  worldHealth,
  onRiskChange,
  onIncidentResolved,
  onIncidentEscalated,
}) {
  const rootRef = useRef(null)
  const animRef = useRef(null)

  const [seenIds, setSeenIds] = useState([])
  const [incidentCase, setIncidentCase] = useState(() =>
    pickIncidentCase(INCIDENT_CASES, { worldHealth: 100, seenIds: [] })
  )
  const [incident, setIncident] = useState(() => null)
  const [selectedEvidence, setSelectedEvidence] = useState([])
  const [findings, setFindings] = useState(null)
  const [rootCauseResult, setRootCauseResult] = useState(null)
  const [containmentResult, setContainmentResult] = useState(null)
  const [notice, setNotice] = useState('')

  const timeline = useMemo(
    () => (incidentCase ? buildTimeline(incidentCase.evidence) : []),
    [incidentCase]
  )

  // A short cue when a new stage arrives, through the shared motion
  // helper so reduced-motion and unmount cleanup are handled once.
  useEffect(() => {
    if (!incident || prefersReducedMotion()) return undefined
    const el = rootRef.current?.querySelector('.incident-panel__stage-row')
    if (!el) return undefined

    animRef.current = motion(el, { opacity: [0.4, 1], duration: 320, ease: 'out(3)' })
    return () => stopMotion(animRef.current)
  }, [incident?.state, incident])

  function begin() {
    const opened = openIncident({
      caseId: incidentCase.caseId,
      title: incidentCase.title,
      severity: incidentCase.severity,
      affectedSystem: incidentCase.affectedSystem,
    })
    setIncident(opened)
    setNotice(`Incident ${incidentCase.caseId} opened.`)
  }

  function advance(to, note) {
    const result = transitionIncident(incident, to, { note })
    if (!result.ok) {
      setNotice(result.reason)
      return
    }
    setIncident(result.incident)
    setNotice(`Stage: ${STAGE_LABEL[to]}.`)
  }

  function toggleEvidence(id) {
    setSelectedEvidence((current) =>
      current.includes(id) ? current.filter((e) => e !== id) : [...current, id]
    )
  }

  function submitFindings() {
    const scored = scoreSelection(incidentCase.evidence, selectedEvidence)
    setFindings(scored)
    setNotice(
      scored.complete
        ? 'Every relevant record found, and nothing extra.'
        : `${scored.found.length} of ${scored.found.length + scored.missed.length} relevant records found.`
    )
  }

  function answerRootCause(optionId) {
    const result = checkRootCause(incidentCase, optionId)
    if (!result.ok) return
    setRootCauseResult(result)
    setNotice(result.correct ? 'Root cause supported by the evidence.' : 'That reading is not supported.')
  }

  function contain(actionId) {
    const result = applyContainment(incidentCase.id, actionId)
    if (!result.ok) return

    setContainmentResult(result)
    onRiskChange?.(result.effects.risk)
    advance(INCIDENT_STATE.CONTAINED, `Applied: ${result.action.label}`)
  }

  function finish() {
    const done = transitionIncident(incident, INCIDENT_STATE.RESOLVED, { note: 'Verified' })
    if (!done.ok) return
    setIncident(done.incident)
    onIncidentResolved?.({
      caseId: incidentCase.caseId,
      outcome: 'resolved',
      seconds: elapsedSeconds(done.incident),
      accurate: findings?.complete === true,
      rootCauseCorrect: rootCauseResult?.correct === true,
      appropriateContainment: containmentResult?.appropriate === true,
    })
    setNotice('Incident resolved.')
  }

  /**
   * Hand the incident to tier 2 and stop working it.
   *
   * The lifecycle engine has always allowed this from every stage --
   * escalating is a legitimate outcome, not a failure state, and a
   * responder who cannot tell when a case is beyond them is a worse
   * responder. Nothing in the UI reached that transition until now.
   */
  function escalate() {
    const done = transitionIncident(incident, INCIDENT_STATE.ESCALATED, {
      note: 'Handed to tier 2',
    })
    if (!done.ok) return
    setIncident(done.incident)
    onIncidentEscalated?.({
      caseId: incidentCase.caseId,
      outcome: 'escalated',
      seconds: elapsedSeconds(done.incident),
      stage: incident.state,
    })
    setNotice(`Incident ${incidentCase.caseId} escalated to tier 2.`)
  }

  function nextIncident() {
    const nextSeen = [...seenIds, incidentCase.id]
    const nextCase = pickIncidentCase(INCIDENT_CASES, { worldHealth, seenIds: nextSeen })
    setSeenIds(nextSeen)
    setIncidentCase(nextCase)
    setIncident(null)
    setSelectedEvidence([])
    setFindings(null)
    setRootCauseResult(null)
    setContainmentResult(null)
    setNotice('')
  }

  if (!incidentCase) return null

  const stage = incident?.state ?? null
  const stageIndex = STAGE_ORDER.indexOf(stage)

  return (
    <div className="incident-panel" ref={rootRef}>
      <p className="incident-panel__live" role="status" aria-live="polite">
        {notice}
      </p>

      <div className="incident-panel__head">
        <div className="incident-panel__id">
          <SeverityBadge level={incidentCase.severity} />
          <span className="incident-panel__case">{incidentCase.caseId}</span>
        </div>
        <h3 className="incident-panel__title">{incidentCase.title}</h3>
        <p className="incident-panel__summary">{incidentCase.description}</p>
        <p className="incident-panel__system">
          Affected system: <span>{incidentCase.affectedSystem}</span>
        </p>
      </div>

      {/* Stage rail — text as well as colour, so the state is never colour-only. */}
      {incident && (
        <ol className="incident-panel__stage-row" aria-label="Response stage">
          {STAGE_ORDER.map((s, i) => {
            const state = i < stageIndex ? 'done' : i === stageIndex ? 'current' : 'todo'
            return (
              <li key={s} className={`incident-panel__stage incident-panel__stage--${state}`}>
                <span className="incident-panel__stage-dot" aria-hidden="true" />
                <span className="incident-panel__stage-name">{STAGE_LABEL[s]}</span>
                {state === 'current' && <span className="incident-panel__sr"> (current stage)</span>}
              </li>
            )
          })}
        </ol>
      )}

      {!incident && (
        <button type="button" className="incident-panel__primary" onClick={begin}>
          Open investigation
        </button>
      )}

      {stage === INCIDENT_STATE.DETECTED && (
        <button
          type="button"
          className="incident-panel__primary"
          onClick={() => advance(INCIDENT_STATE.INVESTIGATING, 'Analyst assigned')}
        >
          Begin investigating
        </button>
      )}

      {stage === INCIDENT_STATE.INVESTIGATING && (
        <>
          <fieldset className="incident-panel__evidence">
            <legend className="incident-panel__legend">
              Evidence — select the records that belong to this incident
            </legend>
            {timeline.map((item) => {
              const checked = selectedEvidence.includes(item.id)
              const verdict = findings
                ? item.relevant
                  ? checked ? 'found' : 'missed'
                  : checked ? 'noise' : null
                : null

              return (
                <label
                  key={item.id}
                  className={`incident-panel__record${verdict ? ` incident-panel__record--${verdict}` : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={Boolean(findings)}
                    onChange={() => toggleEvidence(item.id)}
                  />
                  <span className="incident-panel__record-body">
                    <span className="incident-panel__record-meta">
                      <span className="incident-panel__record-time">{item.time}</span>
                      <span className="incident-panel__record-source">{item.source}</span>
                      <span className="incident-panel__record-type">{item.eventType}</span>
                    </span>
                    <span className="incident-panel__record-text">{item.description}</span>
                    {verdict && (
                      <span className={`incident-panel__verdict incident-panel__verdict--${verdict}`}>
                        {verdict === 'found' && 'Part of the chain'}
                        {verdict === 'missed' && 'Missed — this was part of the chain'}
                        {verdict === 'noise' && 'Unrelated background activity'}
                      </span>
                    )}
                  </span>
                </label>
              )
            })}
          </fieldset>

          {!findings ? (
            <button
              type="button"
              className="incident-panel__primary"
              onClick={submitFindings}
              disabled={selectedEvidence.length === 0}
            >
              Submit findings
            </button>
          ) : (
            <div className="incident-panel__block">
              <h4 className="incident-panel__block-title">Root cause</h4>
              <p className="incident-panel__block-note">
                Based on what the timeline actually shows, what happened here?
              </p>
              <div className="incident-panel__options" role="group" aria-label="Root cause options">
                {incidentCase.rootCauseOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className="incident-panel__option"
                    onClick={() => answerRootCause(option.id)}
                    disabled={Boolean(rootCauseResult)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              {rootCauseResult && (
                <div
                  className={`incident-panel__outcome incident-panel__outcome--${rootCauseResult.correct ? 'right' : 'wrong'}`}
                >
                  <p className="incident-panel__outcome-verdict">
                    {rootCauseResult.correct ? 'Supported by the evidence' : 'Not supported by the evidence'}
                  </p>
                  <p className="incident-panel__outcome-text">{rootCauseResult.explanation}</p>
                  {!rootCauseResult.correct && (
                    <p className="incident-panel__outcome-text">
                      The evidence points to: {correctRootCause(incidentCase).label}.
                    </p>
                  )}

                  <h4 className="incident-panel__block-title">Containment</h4>
                  <p className="incident-panel__block-note">
                    Every option below costs something. Choose what this incident actually needs.
                  </p>
                  <div className="incident-panel__options" role="group" aria-label="Containment actions">
                    {CONTAINMENT_ACTIONS.map((action) => (
                      <button
                        key={action.id}
                        type="button"
                        className="incident-panel__option"
                        onClick={() => contain(action.id)}
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {containmentResult && stage && stageIndex >= STAGE_ORDER.indexOf(INCIDENT_STATE.CONTAINED) && (
        <div
          className={`incident-panel__outcome incident-panel__outcome--${containmentResult.appropriate ? 'right' : 'wrong'}`}
        >
          <p className="incident-panel__outcome-verdict">
            {containmentResult.action.label} —{' '}
            {containmentResult.appropriate
              ? 'addresses this incident'
              : 'does not address this incident'}
          </p>
          <p className="incident-panel__outcome-text">{containmentResult.tradeOff}</p>
          <ul className="incident-panel__effects">
            <li>Risk {containmentResult.effects.risk}</li>
            <li>Cloud availability {containmentResult.effects.cloudAvailability}</li>
            <li>Pipeline {containmentResult.effects.pipelineStatus}</li>
          </ul>
        </div>
      )}

      {stage === INCIDENT_STATE.CONTAINED && (
        <button
          type="button"
          className="incident-panel__primary"
          onClick={() => advance(INCIDENT_STATE.ERADICATION, 'Removing the cause')}
        >
          Move to eradication
        </button>
      )}

      {stage === INCIDENT_STATE.ERADICATION && (
        <button
          type="button"
          className="incident-panel__primary"
          onClick={() => advance(INCIDENT_STATE.RECOVERY, 'Restoring service')}
        >
          Begin recovery
        </button>
      )}

      {stage === INCIDENT_STATE.RECOVERY && (
        <button
          type="button"
          className="incident-panel__primary"
          onClick={() => advance(INCIDENT_STATE.VERIFICATION, 'Checking the fix held')}
        >
          Verify the fix
        </button>
      )}

      {stage === INCIDENT_STATE.VERIFICATION && (
        <button type="button" className="incident-panel__primary" onClick={finish}>
          Close the incident
        </button>
      )}

      {/* Escalation is available from any open stage, matching what the
          lifecycle engine allows. Kept visually secondary so it reads as
          the deliberate choice it is rather than the obvious next click. */}
      {incident &&
        stage !== INCIDENT_STATE.RESOLVED &&
        stage !== INCIDENT_STATE.ESCALATED && (
          <button type="button" className="incident-panel__escalate" onClick={escalate}>
            Escalate to tier 2
          </button>
        )}

      {stage === INCIDENT_STATE.ESCALATED && (
        <div className="incident-panel__postmortem">
          <h4 className="incident-panel__block-title">Escalated</h4>
          <p className="incident-panel__escalated-note">
            {incidentCase.caseId} was handed to tier 2 after{' '}
            {responseTimeline(incident).stages.length} recorded stage
            {responseTimeline(incident).stages.length === 1 ? '' : 's'}. Nothing
            is scored for an escalation — it is recorded in the operations log
            as its own outcome.
          </p>
          <button type="button" className="incident-panel__primary" onClick={nextIncident}>
            Next incident
          </button>
        </div>
      )}

      {stage === INCIDENT_STATE.RESOLVED && (
        <div className="incident-panel__postmortem">
          <h4 className="incident-panel__block-title">Post-mortem</h4>
          <dl className="incident-panel__summary-list">
            <div>
              <dt>Evidence</dt>
              <dd>
                {findings?.complete
                  ? 'Complete — every relevant record, nothing extra'
                  : `${findings?.found.length ?? 0} found · ${findings?.missed.length ?? 0} missed · ${findings?.noise.length ?? 0} unrelated`}
              </dd>
            </div>
            <div>
              <dt>Root cause</dt>
              <dd>{rootCauseResult?.correct ? 'Identified correctly' : 'Misidentified'}</dd>
            </div>
            <div>
              <dt>Containment</dt>
              <dd>
                {containmentResult?.appropriate
                  ? `${containmentResult.action.label} — appropriate`
                  : `${containmentResult?.action.label ?? 'None'} — did not address the cause`}
              </dd>
            </div>
            <div>
              <dt>Stages recorded</dt>
              <dd>{responseTimeline(incident).stages.length}</dd>
            </div>
          </dl>
          <button type="button" className="incident-panel__primary" onClick={nextIncident}>
            Next incident
          </button>
        </div>
      )}
    </div>
  )
}
