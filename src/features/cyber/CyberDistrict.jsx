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
import { getSystemStatusLevel } from '../../game/systemHealth'
import {
  SECTOR_STATE,
  landingSector,
  resolveSectors,
  sectorTally,
} from '../../game/cyberNavigation'
import {
  appendEvent,
  defenseToggleEvent,
  forensicsClosedEvent,
  incidentClosedEvent,
  missionCompletedEvent,
  networkDecisionEvent,
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
import SecurityOps from '../analytics/SecurityOps'
import ForensicsBoard from './forensics/ForensicsBoard'
import IntelWorkspace from './intel/IntelWorkspace'
import NetworkOperations from './network/NetworkOperations'
import BootSequence from './components/BootSequence'
import DefenseStatus from './components/DefenseStatus'
import IncidentPanel from './components/IncidentPanel'
import MissionPanel from './components/MissionPanel'
import EventFeed from './components/EventFeed'
import SectorRail from './components/SectorRail'
import SystemStatus from './components/SystemStatus'
import SeverityBadge from './components/SeverityBadge'
import ThreatPanel from './components/ThreatPanel'
import './CyberDistrict.css'

const SEVERITY_LEVELS = ['low', 'medium', 'high', 'critical']

/**
 * Cyber District.
 *
 * The integration point for the district: it owns the state the sectors
 * share (world health, security score, defense rules, mission progress)
 * and passes each one only what it needs.
 *
 * The district is organised as sectors rather than one long page. The
 * catalogue of what exists lives in data/cyberSectors.js and what is
 * reachable right now is resolved in game/cyberNavigation.js, so this
 * component decides layout and nothing else about navigation.
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
  // The entry sequence runs once per visit to the district, and not at
  // all for someone who asked for reduced motion.
  const [booted, setBooted] = useState(prefersReducedMotion)
  const [requestedSector, setRequestedSector] = useState(null)
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
  // The ref is where appends happen; this mirrors it so the feed
  // re-renders. Two holders of one list is a smell, but the alternative
  // -- appending inside a state updater -- puts a side effect somewhere
  // React is free to run twice.
  const [feed, setFeed] = useState([])

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
      if (cancelled) return
      eventsRef.current = saved
      setFeed(saved)
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
    setFeed(eventsRef.current)
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
    if (!root || !booted) return undefined
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
  }, [booted])

  const missions = missionsWithStatus(progress)
  const sectors = resolveSectors(progress)
  const tally = sectorTally(sectors)
  // Resolved rather than stored: a sector that was open when it was
  // chosen can be locked again by a reset, and the district must land
  // somewhere real either way.
  const activeSectorId = landingSector(sectors, requestedSector)
  const activeSector = sectors.find((sector) => sector.id === activeSectorId)
  const baseRisk = assessRisk({ worldHealth, ruleStates })
  const risk = {
    ...baseRisk,
    value: Math.max(0, Math.min(100, baseRisk.value + riskOffset)),
  }

  if (!booted) {
    return <BootSequence onComplete={() => setBooted(true)} />
  }

  return (
    <section
      ref={rootRef}
      className="cyber-district"
      aria-labelledby="cyber-district-title"
      data-world-state={getSystemStatusLevel(worldHealth)}
    >
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

      <div className="cyber-district__shell">
        <div className="cyber-district__rail">
          {/* Said out loud, because a rail of nine where six are not
              available reads as a broken build until it explains itself. */}
          <p className="cyber-district__tally">
            {tally.online} of {tally.total} sectors online · {tally.locked} locked ·{' '}
            {tally.planned} not deployed yet
          </p>
          <SectorRail sectors={sectors} activeId={activeSectorId} onSelect={setRequestedSector} />
        </div>

        <div
          className="cyber-district__stage"
          id={`sector-panel-${activeSectorId}`}
          role="tabpanel"
          aria-labelledby={`sector-tab-${activeSectorId}`}
          tabIndex={0}
        >
          <header className="cyber-district__stage-head">
            <p className="cyber-district__stage-code">
              {activeSector.code} · {activeSector.tagline}
            </p>
            <h2 className="cyber-district__stage-title">{activeSector.label}</h2>
            <p className="cyber-district__stage-summary">{activeSector.summary}</p>
          </header>

          {activeSector.state !== SECTOR_STATE.ONLINE && (
            <div
              className={`cyber-district__unavailable cyber-district__unavailable--${activeSector.state}`}
            >
              <p className="cyber-district__unavailable-status">
                {activeSector.state === SECTOR_STATE.LOCKED
                  ? 'ACCESS DENIED'
                  : 'SECTOR OFFLINE'}
              </p>
              <p className="cyber-district__unavailable-reason">{activeSector.reason}</p>
            </div>
          )}

          {activeSectorId === 'operations' && (
            <>
              <div className="cyber-district__grid">
                <article className="cyber-district__panel cv-panel" aria-labelledby="threat-severity-heading">
                  <h3 id="threat-severity-heading" className="cyber-district__panel-heading">
                    Threat Severity
                  </h3>
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

                <article className="cyber-district__panel cv-panel" aria-labelledby="threat-monitor-heading">
                  <h3 id="threat-monitor-heading" className="cyber-district__panel-heading">
                    Threat Monitor
                  </h3>
                  <ThreatPanel
                    worldHealth={worldHealth}
                    onHealthChange={applyHealthDelta}
                    onScoreChange={handleResponse}
                  />
                </article>

                <article className="cyber-district__panel cv-panel" aria-labelledby="defense-status-heading">
                  <h3 id="defense-status-heading" className="cyber-district__panel-heading">
                    Defense Status
                  </h3>
                  <DefenseStatus
                    ruleStates={ruleStates}
                    onToggleRule={toggleRule}
                    onHealthChange={applyHealthDelta}
                  />
                </article>

                <article className="cyber-district__panel cv-panel" aria-labelledby="missions-heading">
                  <h3 id="missions-heading" className="cyber-district__panel-heading">
                    Missions
                  </h3>
                  <MissionPanel missions={missions} />
                </article>

                <article className="cyber-district__panel cv-panel" aria-labelledby="system-status-heading">
                  <h3 id="system-status-heading" className="cyber-district__panel-heading">
                    System Status
                  </h3>
                  <SystemStatus worldHealth={worldHealth} ruleStates={ruleStates} risk={risk} />
                </article>

                <article
                  className="cyber-district__panel cyber-district__panel--wide cv-panel"
                  aria-labelledby="event-feed-heading"
                >
                  <h3 id="event-feed-heading" className="cyber-district__panel-heading">
                    Security Event Feed
                  </h3>
                  <p className="cyber-district__panel-note">
                    The same log the Analytics sector derives its charts from, read
                    newest first.
                  </p>
                  <EventFeed events={feed} />
                </article>
              </div>
            </>
          )}

          {activeSectorId === 'incident-response' && activeSector.state === SECTOR_STATE.ONLINE && (
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
          )}

          {activeSectorId === 'forensics' && (
            <ForensicsBoard
              onCaseClosed={({ caseId, chainComplete, correct, indicators }) =>
                record(forensicsClosedEvent({ caseId, correct, chainComplete, indicators }))
              }
            />
          )}

          {activeSectorId === 'network' && (
            <NetworkOperations
              worldHealth={worldHealth}
              ruleStates={ruleStates}
              onHealthChange={applyHealthDelta}
              onDecision={(decision) => record(networkDecisionEvent(decision))}
            />
          )}

          {activeSectorId === 'intelligence' && <IntelWorkspace events={feed} />}

          {activeSectorId === 'analytics' && <SecurityOps embedded />}
        </div>
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
