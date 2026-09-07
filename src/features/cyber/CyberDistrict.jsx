import { useCallback, useEffect, useRef, useState } from 'react'
import { stagger } from 'animejs'
import { DEFENSE_RULES } from '../../game/defenseRules'
import { clampWorldHealth, INITIAL_WORLD_HEALTH } from '../../game/threatEngine'
import { applyResponseToScore, INITIAL_SECURITY_SCORE_STATE } from '../../game/securityScore'
import { INITIAL_PROGRESS, missionsWithStatus, recordResponse } from '../../game/missionState'
import { loadProgress, saveProgress } from '../../services/progressService'
import {
  motionTimeline,
  prefersReducedMotion,
  settleIfReduced,
  stopMotion,
} from '../../lib/motion'
import DefenseStatus from './components/DefenseStatus'
import MissionPanel from './components/MissionPanel'
import SeverityBadge from './components/SeverityBadge'
import ThreatPanel from './components/ThreatPanel'
import './CyberDistrict.css'

const SEVERITY_LEVELS = ['low', 'medium', 'high', 'critical']

const allRulesOn = () => Object.fromEntries(DEFENSE_RULES.map((rule) => [rule.id, true]))

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
  const [ruleStates, setRuleStates] = useState(allRulesOn)
  const [progress, setProgress] = useState(INITIAL_PROGRESS)
  const [justCompleted, setJustCompleted] = useState([])

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
    return () => {
      cancelled = true
    }
  }, [])

  const applyHealthDelta = useCallback((delta) => {
    setWorldHealth((current) => clampWorldHealth(current + delta))
  }, [])

  const toggleRule = useCallback((ruleId) => {
    setRuleStates((current) => ({ ...current, [ruleId]: !current[ruleId] }))
  }, [])

  /**
   * One resolved threat: score it, fold it into mission progress, and
   * persist. Health has already been applied by ThreatPanel's own
   * onHealthChange call, so the value read here is the post-response
   * one the missions should be judged against.
   */
  const handleResponse = useCallback(
    (correct) => {
      const nextScore = applyResponseToScore(scoreState, correct)
      setScoreState(nextScore)

      const health = clampWorldHealth(worldHealth + (correct ? 5 : -10))
      const { progress: nextProgress, newlyCompleted } = recordResponse(progress, {
        correct,
        streak: nextScore.streak,
        securityScore: nextScore.score,
        worldHealth: health,
        allDefensesOn: Object.values(ruleStates).every(Boolean),
      })

      setProgress(nextProgress)
      if (newlyCompleted.length > 0) setJustCompleted(newlyCompleted)
      saveProgress(nextProgress)
    },
    [progress, ruleStates, scoreState, worldHealth]
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
