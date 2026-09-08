import { useCallback, useEffect, useRef, useState } from 'react'
import { stagger } from 'animejs'
import {
  allRulesActive,
  getActiveRulesCount,
  getInitialRuleStates,
} from '../../game/defenseRules'
import { clampWorldHealth, INITIAL_WORLD_HEALTH } from '../../game/threatEngine'
import { applyResponseToScore, INITIAL_SECURITY_SCORE_STATE } from '../../game/securityScore'
import { INITIAL_PROGRESS, missionsWithStatus, recordResponse } from '../../game/missionState'
import { assessRisk } from '../../game/riskScore'
import {
  appendEvent,
  defenseToggleEvent,
  incidentClosedEvent,
  missionCompletedEvent,
  threatResponseEvent,
} from '../../game/securityEvents'
import {
  loadEvents,
  loadProgress,
  saveEvents,
  saveProgress,
} from '../../services/progressService'
import {
  motionTimeline,
  prefersReducedMotion,
  settleIfReduced,
  stopMotion,
} from '../../lib/motion'
import DefenseStatus from './components/DefenseStatus'
import IncidentPanel from './components/IncidentPanel'
import MissionPanel from './components/MissionPanel'
import SeverityBadge from './components/SeverityBadge'
import ThreatPanel from './components/ThreatPanel'
import './CyberDistrict.css'

const SEVERITY_LEVELS = ['low', 'medium', 'high', 'critical']

/**
 * Cyber District.
 *
 * The integration point for the district: it owns the state the panels
 * share (world health, security score, defense rules, mission progress)
 * and passes each panel only what that panel needs.
 *
 * Layering, per the architecture doc: rules live in game/, content in
 * data/, and persistence is reached only through services/ -- this
 * component never touches storage/ or data/ directly.
 *
 * Progress is loaded once on mount and saved after each resolved
 * threat, so a refresh mid-session keeps missions and score rather than
 * silently starting over.
 */
export default function CyberDistrict({ onExit }) {
  const rootRef = useRef(null)
  const timelineRef = useRef(null)
  const [ready, setReady] = useState(prefersReducedMotion)
  const [activeSeverity, setActiveSeverity] = useState('low')
  const [worldHealth, setWorldHealth] = useState(INITIAL_WORLD_HEALTH)
  const [scoreState, setScoreState] = useState(INITIAL_SECURITY_SCORE_STATE)
  const [ruleStates, setRuleStates] = useState(getInitialRuleStates)
  const [progress, setProgress] = useState(INITIAL_PROGRESS)
  const [justCompleted, setJustCompleted] = useState([])
  // Containment decisions move exposure directly, so risk needs an input
  // beyond health and rule states. Clamped so it can never invert the reading.
  const [riskOffset, setRiskOffset] = useState(0)
  // The security event log. Appended to here and read by the Operations
  // Center; this district never reads it back to make a decision, so a
  // failed write costs analytics and nothing else. Held in a ref rather
  // than state because nothing on this screen renders it -- and because
  // appending is a side effect, which must not live inside a state
  // updater that React is free to run more than once.
  const eventsRef = useRef([])

  // Load once on mount. A failed or empty load leaves the fresh
  // defaults in place, so the district is always playable.
  useEffect(() => {
    let cancelled = false
    loadProgress().then((saved) => {
      if (cancelled) return
      setProgress(saved)
      setScoreState({ score: saved.securityScore, streak: 0 })
      setWorldHealth(saved.worldHealth)
    })
    loadEvents().then((saved) => {
      if (!cancelled) eventsRef.current = saved
    })
    return () => {
      cancelled = true
    }
  }, [])

  const applyHealthDelta = useCallback((delta) => {
    setWorldHealth((current) => clampWorldHealth(current + delta))
  }, [])

  /**
   * Appends one event and persists the log.
   *
   * Reads and writes the ref so several events recorded in the same tick
   * each build on the previous one -- a mission completing at the same
   * moment as the response that completed it must not be written over by
   * a log that never saw it.
   */
  const record = useCallback((event) => {
    eventsRef.current = appendEvent(eventsRef.current, event)
    saveEvents(eventsRef.current)
  }, [])

  const toggleRule = useCallback(
    (ruleId) => {
      const next = { ...ruleStates, [ruleId]: !ruleStates[ruleId] }
      setRuleStates(next)
      record(
        defenseToggleEvent({
          ruleId,
          on: next[ruleId],
          activeCount: getActiveRulesCount(next),
        })
      )
    },
    [record, ruleStates]
  )

  /**
   * One resolved threat: score it, fold it into mission progress, and
   * persist. Health has already been applied by ThreatPanel's own
   * onHealthChange call, so the value read here is the post-response
   * one the missions should be judged against.
   */
  const handleResponse = useCallback(
    (correct, severity) => {
      const nextScore = applyResponseToScore(scoreState, correct)
      setScoreState(nextScore)

      const health = clampWorldHealth(worldHealth + (correct ? 5 : -10))
      const allDefensesOn = allRulesActive(ruleStates)
      const { progress: nextProgress, newlyCompleted } = recordResponse(progress, {
        correct,
        streak: nextScore.streak,
        securityScore: nextScore.score,
        worldHealth: health,
        allDefensesOn,
      })

      setProgress(nextProgress)
      if (newlyCompleted.length > 0) setJustCompleted(newlyCompleted)
      saveProgress(nextProgress)

      record(
        threatResponseEvent({
          severity,
          correct,
          healthAfter: health,
          scoreAfter: nextScore.score,
          allDefensesOn,
        })
      )
      newlyCompleted.forEach((mission) =>
        record(missionCompletedEvent({ missionId: mission.id ?? mission }))
      )
    },
    [progress, record, ruleStates, scoreState, worldHealth]
  )

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const q = (selector) => root.querySelectorAll(selector)

    const tl = motionTimeline({
      defaults: { ease: 'out(3)' },
      onComplete: () => setReady(true),
    })

    tl.add(q('.cyber-district__eyebrow'), {
      opacity: [0, 1], y: [-8, 0], duration: 400,
    })
      .add(q('.cyber-district__title'), {
        opacity: [0, 1], scale: [0.96, 1], duration: 600,
      }, '-=250')
      .add(q('.cyber-district__panel'), {
        opacity: [0, 1], y: [16, 0], duration: 450, delay: stagger(120),
      }, '-=200')

    timelineRef.current = tl
    settleIfReduced(tl)

    return () => stopMotion(timelineRef.current)
  }, [])

  const missions = missionsWithStatus(progress)
  const baseRisk = assessRisk({ worldHealth, ruleStates })
  const risk = {
    ...baseRisk,
    value: Math.max(0, Math.min(100, baseRisk.value + riskOffset)),
  }

  return (
    <section ref={rootRef} className="cyber-district" aria-labelledby="cyber-district-title">
      <p className="cyber-district__eyebrow">CYBER DISTRICT</p>
      <div className="cyber-district__title-row">
        <h1 id="cyber-district-title" className="cyber-district__title">
          Security Command
        </h1>
        <div className="cyber-district__stats">
          <div className="cyber-district__health" role="status" aria-label={`World health ${worldHealth}`}>
            <span className="cyber-district__health-label">World Health</span>
            <div className="cyber-district__health-bar">
              <div className="cyber-district__health-fill" style={{ width: `${worldHealth}%` }} />
            </div>
            <span className="cyber-district__health-value">{worldHealth}</span>
          </div>
          <div
            className="cyber-district__score"
            role="status"
            aria-label={`Security score ${scoreState.score}${scoreState.streak > 1 ? `, ${scoreState.streak} correct in a row` : ''}`}
          >
            <span className="cyber-district__score-label">Security Score</span>
            <span className="cyber-district__score-value">{scoreState.score}</span>
            {scoreState.streak > 1 && (
              <span className="cyber-district__score-streak">{scoreState.streak}x streak</span>
            )}
          </div>
          <div
            className="cyber-district__risk"
            role="status"
            aria-label={`Risk ${risk.value}, ${risk.level}`}
          >
            <span className="cyber-district__risk-label">Risk</span>
            <span className={`cyber-district__risk-value cyber-district__risk-value--${risk.level}`}>
              {risk.value}
            </span>
          </div>
        </div>
      </div>

      <p className="cyber-district__mission-announce" role="status" aria-live="polite">
        {justCompleted.length > 0
          ? `Mission complete: ${justCompleted.map((mission) => mission.title).join(', ')}`
          : ''}
      </p>

      <div className="cyber-district__grid">
        <article className="cyber-district__panel" aria-labelledby="threat-severity-heading">
          <h2 id="threat-severity-heading" className="cyber-district__panel-heading">
            Threat Severity
          </h2>
          <div className="cyber-district__severity-row" role="group" aria-label="Threat severity filter">
            {SEVERITY_LEVELS.map((level) => (
              <SeverityBadge
                key={level}
                level={level}
                active={activeSeverity === level}
                onClick={() => setActiveSeverity(level)}
              />
            ))}
          </div>
        </article>

        <article className="cyber-district__panel" aria-labelledby="incident-response-heading">
          <h2 id="incident-response-heading" className="cyber-district__panel-heading">
            Incident Response
          </h2>
          <ThreatPanel
            worldHealth={worldHealth}
            onHealthChange={applyHealthDelta}
            onScoreChange={handleResponse}
          />
        </article>

        <article className="cyber-district__panel" aria-labelledby="defense-status-heading">
          <h2 id="defense-status-heading" className="cyber-district__panel-heading">
            Defense Status
          </h2>
          <DefenseStatus
            ruleStates={ruleStates}
            onToggleRule={toggleRule}
            onHealthChange={applyHealthDelta}
          />
        </article>

        <article className="cyber-district__panel" aria-labelledby="missions-heading">
          <h2 id="missions-heading" className="cyber-district__panel-heading">
            Missions
          </h2>
          <MissionPanel missions={missions} />
        </article>
      </div>

      <section className="cyber-district__incident" aria-labelledby="incident-command-heading">
        <h2 id="incident-command-heading" className="cyber-district__panel-heading">
          Incident Command
        </h2>
        <IncidentPanel
          worldHealth={worldHealth}
          onRiskChange={(delta) => setRiskOffset((current) => current + delta)}
          onIncidentResolved={({ appropriateContainment, caseId, rootCauseCorrect, seconds }) => {
            // A clean response repays some world health; a poor one does not.
            if (rootCauseCorrect && appropriateContainment) applyHealthDelta(5)
            record(incidentClosedEvent({ caseId, outcome: 'resolved', seconds }))
          }}
          onIncidentEscalated={({ caseId, seconds }) =>
            record(incidentClosedEvent({ caseId, outcome: 'escalated', seconds }))
          }
        />
      </section>

      <button
        type="button"
        className="cyber-district__exit"
        onClick={onExit}
        disabled={!ready}
      >
        Back to intro
      </button>
    </section>
  )
}
