import React, { useState, useEffect, useRef, useCallback } from 'react'
import { stagger } from 'animejs'
import {
  PIPELINE_STAGES,
  STAGE_STATUS,
  PIPELINE_STATUS,
  getInitialStageStates,
  findStage,
} from './pipelineStages'
import {
  PIPELINE_INCIDENTS,
  findIncidentForStage,
} from './pipelineIncidents'
import { clampWorldHealth, INITIAL_WORLD_HEALTH } from '../../game/threatEngine'
import { loadProgress, saveProgress } from '../../services/progressService'
import { motionTimeline, settleIfReduced, stopMotion } from '../../lib/motion'
import CloudDevOpsBridge from '../../components/CloudDevOpsBridge'
import './DevOpsPipeline.css'

/**
 * Schematic SVG Glyphs for the six pipeline stages.
 */
function StageGlyph({ type }) {
  if (type === 'code') {
    return (
      <svg
        className="pipeline-node__glyph"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
        <line x1="14" y1="4" x2="10" y2="20" />
      </svg>
    )
  }

  if (type === 'build') {
    return (
      <svg
        className="pipeline-node__glyph"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="m7.5 4.27 9 5.15" />
        <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
        <path d="m3.3 7 8.7 5 8.7-5" />
        <path d="M12 22V12" />
      </svg>
    )
  }

  if (type === 'test') {
    return (
      <svg
        className="pipeline-node__glyph"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M14.5 2v17.5c0 1.4-1.1 2.5-2.5 2.5s-2.5-1.1-2.5-2.5V2" />
        <path d="M8.5 2h7" />
        <path d="M14.5 16h-5" />
        <path d="M6 9l2 2 4-4" />
      </svg>
    )
  }

  if (type === 'package') {
    return (
      <svg
        className="pipeline-node__glyph"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M20 7.5v9l-8 4.5-8-4.5v-9L12 3z" />
        <path d="M12 12v9" />
        <path d="M12 12l8-4.5" />
        <path d="M12 12L4 7.5" />
      </svg>
    )
  }

  if (type === 'deploy') {
    return (
      <svg
        className="pipeline-node__glyph"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
        <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
        <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
        <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
      </svg>
    )
  }

  // Live
  return (
    <svg
      className="pipeline-node__glyph"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
      <path d="M2 12h20" />
    </svg>
  )
}

/** Formats a timestamp for the activity log */
function getTimestamp() {
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
}

/**
 * DevOps District Component.
 *
 * Implements the continuous deployment highway:
 * CODE -> BUILD -> TEST -> PACKAGE -> DEPLOY -> LIVE
 */
export default function DevOpsPipeline({ onBackToIntro, onBackToMap, onNavigateToCloud }) {
  const [stageStates, setStageStates] = useState(getInitialStageStates)
  const [pipelineState, setPipelineState] = useState(PIPELINE_STATUS.READY)
  const [selectedStageId, setSelectedStageId] = useState('code')
  const [simulationMode, setSimulationMode] = useState('nominal') // 'nominal' | 'build-failure' | 'test-failure' | 'deploy-failure'
  const [activeFailure, setActiveFailure] = useState(null)
  const [activityLogs, setActivityLogs] = useState([
    { id: 1, time: getTimestamp(), text: 'DevOps telemetry mesh online. Pipeline ready for execution.' },
  ])
  const [worldHealth, setWorldHealth] = useState(INITIAL_WORLD_HEALTH)
  const [isSimulatorMenuOpen, setIsSimulatorMenuOpen] = useState(false)

  // Execution refs
  const executionTimerRef = useRef(null)
  const executionIndexRef = useRef(0)
  const isRunningRef = useRef(false)
  const rewardedRef = useRef(false)
  const penalizedRef = useRef(false)
  const progressRef = useRef(null)
  const executeStageAtIndexRef = useRef(null)

  const rootRef = useRef(null)
  const timelineRef = useRef(null)
  const detailPanelRef = useRef(null)
  const detailTimelineRef = useRef(null)

  const selectedStage = findStage(selectedStageId)

  // Load World Health once on mount from progressService
  useEffect(() => {
    let cancelled = false
    loadProgress().then((saved) => {
      if (cancelled) return
      progressRef.current = saved
      if (typeof saved.worldHealth === 'number') {
        setWorldHealth(clampWorldHealth(saved.worldHealth))
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  // Update World Health cleanly through services/progressService
  const applyWorldHealthDelta = useCallback((delta) => {
    setWorldHealth((current) => {
      const next = clampWorldHealth(current + delta)
      const updated = {
        ...progressRef.current,
        worldHealth: next,
      }
      progressRef.current = updated
      saveProgress(updated)
      return next
    })
  }, [])

  // Append a timestamped entry to the activity log
  const logEvent = useCallback((text) => {
    setActivityLogs((prev) => [
      { id: Date.now() + Math.random(), time: getTimestamp(), text },
      ...prev.slice(0, 19), // Keep latest 20 entries
    ])
  }, [])

  // Keyboard shortcut: Escape to close inspection panel or simulator dropdown
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isSimulatorMenuOpen) {
          setIsSimulatorMenuOpen(false)
        } else if (selectedStageId) {
          setSelectedStageId(null)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedStageId, isSimulatorMenuOpen])

  // Cleanup execution timers on unmount
  useEffect(() => {
    return () => {
      if (executionTimerRef.current) clearTimeout(executionTimerRef.current)
    }
  }, [])

  // Initial entry animation for DevOps district
  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    const q = (selector) => root.querySelectorAll(selector)

    const tl = motionTimeline({
      defaults: { ease: 'out(3)' },
    })

    tl.add(q('.devops-district__header'), {
      opacity: [0, 1],
      y: [-16, 0],
      duration: 600,
    })
      .add(
        q('.pipeline-node'),
        {
          opacity: [0, 1],
          y: [20, 0],
          duration: 450,
          delay: stagger(90),
        },
        '-=300'
      )
      .add(
        q('.pipeline-highway__conduit-path'),
        {
          opacity: [0, 0.7],
          duration: 400,
        },
        '-=200'
      )

    timelineRef.current = tl
    settleIfReduced(tl)

    return () => stopMotion(timelineRef.current)
  }, [])

  // Animate inspection panel reveal when selected stage changes
  useEffect(() => {
    if (!selectedStageId) return
    const panel = detailPanelRef.current
    if (!panel) return

    stopMotion(detailTimelineRef.current)

    const tl = motionTimeline({
      defaults: { ease: 'out(3)' },
    })

    tl.add(panel, {
      opacity: [0, 1],
      y: [12, 0],
      duration: 300,
    }).add(
      panel.querySelectorAll('.devops-detail__metric-card'),
      {
        opacity: [0, 1],
        y: [8, 0],
        duration: 250,
        delay: stagger(30),
      },
      '-=150'
    )

    settleIfReduced(tl)
    detailTimelineRef.current = tl

    return () => stopMotion(detailTimelineRef.current)
  }, [selectedStageId])

  /**
   * Execute stage at index in the pipeline sequence.
   */
  const executeStageAtIndex = useCallback(
    (index) => {
      if (index >= PIPELINE_STAGES.length) {
        // Entire pipeline completed successfully!
        isRunningRef.current = false
        setPipelineState(PIPELINE_STATUS.SUCCESS)
        logEvent('DEPLOYMENT SUCCESS: All 6 stages completed. Release v1.0.4 is LIVE.')

        // Apply +5 World Health reward once
        if (!rewardedRef.current) {
          applyWorldHealthDelta(5)
          rewardedRef.current = true
        }

        setSelectedStageId('live')
        return
      }

      const stage = PIPELINE_STAGES[index]
      executionIndexRef.current = index
      setSelectedStageId(stage.id)

      // Check if this stage is configured to simulate a failure
      const incident = findIncidentForStage(stage.id)
      const shouldFail =
        incident &&
        simulationMode === incident.id &&
        !activeFailure

      // Transition current stage to RUNNING
      setStageStates((prev) => ({
        ...prev,
        [stage.id]: STAGE_STATUS.RUNNING,
      }))
      logEvent(`${stage.name}: Stage execution started (${stage.title})...`)

      // Simulate stage processing time
      executionTimerRef.current = setTimeout(() => {
        if (shouldFail) {
          // Failure encountered!
          isRunningRef.current = false
          setStageStates((prev) => ({
            ...prev,
            [stage.id]: STAGE_STATUS.FAILED,
          }))
          setPipelineState(PIPELINE_STATUS.FAILED)
          setActiveFailure(incident)
          logEvent(`ERROR: ${stage.name} failed! ${incident.title}.`)

          // Apply -10 World Health penalty once for failure
          if (!penalizedRef.current) {
            applyWorldHealthDelta(-10)
            penalizedRef.current = true
          }
          return
        }

        // Stage completed successfully
        setStageStates((prev) => ({
          ...prev,
          [stage.id]: STAGE_STATUS.SUCCESS,
        }))
        logEvent(`${stage.name}: Stage completed successfully ✓`)

        // Advance to next stage after short realistic transition pause
        executionTimerRef.current = setTimeout(() => {
          if (executeStageAtIndexRef.current) {
            executeStageAtIndexRef.current(index + 1)
          }
        }, 320)
      }, stage.durationMs)
    },
    [activeFailure, applyWorldHealthDelta, logEvent, simulationMode]
  )

  // Keep ref synchronized with latest executeStageAtIndex function
  useEffect(() => {
    executeStageAtIndexRef.current = executeStageAtIndex
  }, [executeStageAtIndex])

  /**
   * Start or restart pipeline execution from beginning.
   */
  const handleRunPipeline = useCallback(() => {
    if (isRunningRef.current) return

    if (executionTimerRef.current) clearTimeout(executionTimerRef.current)

    // Reset runtime flags
    isRunningRef.current = true
    rewardedRef.current = false
    penalizedRef.current = false
    setActiveFailure(null)
    setStageStates(getInitialStageStates())
    setPipelineState(PIPELINE_STATUS.RUNNING)

    logEvent('PIPELINE INITIATED: Triggering automated CI/CD lifecycle...')
    executeStageAtIndex(0)
  }, [executeStageAtIndex, logEvent])

  /**
   * Retry the failed stage and resume remaining pipeline execution.
   */
  const handleRetryStage = useCallback(() => {
    if (!activeFailure || isRunningRef.current) return

    const failedStageIndex = PIPELINE_STAGES.findIndex((s) => s.id === activeFailure.stageId)
    if (failedStageIndex === -1) return

    const stage = PIPELINE_STAGES[failedStageIndex]

    if (executionTimerRef.current) clearTimeout(executionTimerRef.current)

    isRunningRef.current = true
    setPipelineState(PIPELINE_STATUS.RUNNING)
    setStageStates((prev) => ({
      ...prev,
      [stage.id]: STAGE_STATUS.RUNNING,
    }))

    logEvent(`RECOVERY: Executing ${activeFailure.recoveryAction}...`)

    // Simulate recovery processing
    executionTimerRef.current = setTimeout(() => {
      setStageStates((prev) => ({
        ...prev,
        [stage.id]: STAGE_STATUS.SUCCESS,
      }))
      logEvent(`${stage.name}: Recovery verified ✓ Stage resolved.`)
      setActiveFailure(null)

      // Resume subsequent stages
      executionTimerRef.current = setTimeout(() => {
        executeStageAtIndex(failedStageIndex + 1)
      }, 350)
    }, 1000)
  }, [activeFailure, executeStageAtIndex, logEvent])

  /**
   * Reset pipeline back to clean initial state.
   */
  const handleResetPipeline = useCallback(() => {
    if (executionTimerRef.current) clearTimeout(executionTimerRef.current)
    isRunningRef.current = false
    rewardedRef.current = false
    penalizedRef.current = false
    setActiveFailure(null)
    setStageStates(getInitialStageStates())
    setPipelineState(PIPELINE_STATUS.READY)
    setSelectedStageId('code')
    logEvent('Pipeline reset to baseline READY state.')
  }, [logEvent])

  return (
    <div ref={rootRef} className="devops-district">
      {/* Visual background layers */}
      <div className="devops-district__grid-bg" aria-hidden="true" />
      <div className="devops-district__ambient-glow" aria-hidden="true" />

      {/* Top HUD Navigation Bar */}
      <header className="devops-district__hud">
        <div className="devops-district__hud-left">
          <div className="devops-district__hud-badge">
            <span className="devops-district__beacon-dot" aria-hidden="true" />
            <span>DISTRICT // 02: DEVOPS</span>
          </div>

          {/* Single source of truth World Health integration */}
          <div
            className="devops-district__health-badge"
            role="status"
            aria-label={`World Health: ${worldHealth}%`}
          >
            <span
              className={`devops-district__health-beacon ${
                worldHealth < 50
                  ? 'devops-district__health-beacon--critical'
                  : worldHealth < 80
                    ? 'devops-district__health-beacon--warning'
                    : ''
              }`}
              aria-hidden="true"
            />
            <span className="devops-district__health-label">
              WORLD HEALTH: <strong>{worldHealth}%</strong>
            </span>
            <div className="devops-district__health-track" aria-hidden="true">
              <div
                className={`devops-district__health-fill ${
                  worldHealth < 50
                    ? 'devops-district__health-fill--critical'
                    : worldHealth < 80
                      ? 'devops-district__health-fill--warning'
                      : ''
                }`}
                style={{ width: `${worldHealth}%` }}
              />
            </div>
          </div>

          {/* Pipeline Status Indicator */}
          <div className="devops-district__status-pill">
            <span
              className={`devops-district__status-dot devops-district__status-dot--${pipelineState}`}
              aria-hidden="true"
            />
            <span>PIPELINE: {pipelineState.toUpperCase()}</span>
          </div>
        </div>

        <div className="devops-district__hud-actions">
          {/* Failure Scenario Drill Mode Selector */}
          <div className="devops-district__drill-wrapper">
            <button
              type="button"
              className="devops-district__drill-btn"
              onClick={() => setIsSimulatorMenuOpen((prev) => !prev)}
              aria-expanded={isSimulatorMenuOpen}
              aria-controls="devops-drill-menu"
              aria-label="Toggle Failure Simulation Drill Menu"
            >
              <span>⚙️ SCENARIO:</span>
              <strong className="devops-district__drill-mode-label">
                {simulationMode === 'nominal'
                  ? 'NOMINAL RUN'
                  : simulationMode.replace('-failure', '').toUpperCase() + ' FAULT'}
              </strong>
              <span aria-hidden="true">▼</span>
            </button>

            {isSimulatorMenuOpen && (
              <div
                id="devops-drill-menu"
                className="devops-district__drill-menu"
                role="menu"
                aria-label="Select Pipeline Execution Scenario"
              >
                <div className="devops-district__drill-menu-header">
                  <span>EXECUTION SCENARIOS</span>
                </div>
                <button
                  type="button"
                  role="menuitem"
                  className={`devops-district__drill-item ${
                    simulationMode === 'nominal' ? 'devops-district__drill-item--active' : ''
                  }`}
                  onClick={() => {
                    setSimulationMode('nominal')
                    setIsSimulatorMenuOpen(false)
                  }}
                >
                  <span>✓ Nominal Pipeline (All 6 Stages Pass)</span>
                </button>
                {PIPELINE_INCIDENTS.map((inc) => (
                  <button
                    key={inc.id}
                    type="button"
                    role="menuitem"
                    className={`devops-district__drill-item ${
                      simulationMode === inc.id ? 'devops-district__drill-item--active' : ''
                    }`}
                    onClick={() => {
                      setSimulationMode(inc.id)
                      setIsSimulatorMenuOpen(false)
                    }}
                  >
                    <span className="devops-district__drill-item-code">{inc.code}</span>
                    <span>Simulate {inc.stageId.toUpperCase()} Failure</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {onNavigateToCloud && (
            <button
              type="button"
              className="devops-district__nav-btn devops-district__bridge-link-btn"
              onClick={onNavigateToCloud}
              aria-label="Inspect Cloud Infrastructure"
            >
              <span aria-hidden="true">&larr;</span>
              <span>☁️ CLOUD FABRIC</span>
            </button>
          )}

          {(onBackToMap || onBackToIntro) && (
            <button
              type="button"
              className="devops-district__nav-btn devops-district__back-map-btn"
              onClick={onBackToMap || onBackToIntro}
            >
              &larr; WORLD MAP
            </button>
          )}
        </div>
      </header>

      {/* Main DevOps World Canvas */}
      <main className="devops-district__canvas">
        {/* District Title & Deployment Highway Tag */}
        <header className="devops-district__header">
          <span className="devops-district__tag">Automated CI/CD Highway</span>
          <h1 className="devops-district__title">DevOps District</h1>
          <p className="devops-district__subtitle">
            The autonomous delivery continuum of CLOUDVERSE. Inspect, orchestrate,
            and monitor code commits through compilation, automated testing, container
            vaulting, rolling deployment, and production runtime.
          </p>
        </header>

        {/* Cloud ↔ DevOps Infrastructure Delivery Bridge */}
        <CloudDevOpsBridge
          currentDistrict="devops"
          onNavigate={onNavigateToCloud}
          pipelineStatus={pipelineState}
          worldHealth={worldHealth}
        />

        {/* Global Pipeline Action Bar & Control Highway */}
        <div className="devops-highway-controls">
          <div className="devops-highway-controls__left">
            <button
              type="button"
              className={`devops-action-btn devops-action-btn--primary ${
                pipelineState === PIPELINE_STATUS.RUNNING ? 'devops-action-btn--running' : ''
              }`}
              onClick={handleRunPipeline}
              disabled={pipelineState === PIPELINE_STATUS.RUNNING}
              aria-busy={pipelineState === PIPELINE_STATUS.RUNNING}
              aria-label="Run automated deployment pipeline"
            >
              {pipelineState === PIPELINE_STATUS.RUNNING ? (
                <>
                  <span className="devops-spinner" aria-hidden="true" />
                  <span>PIPELINE RUNNING...</span>
                </>
              ) : (
                <>
                  <span aria-hidden="true">▶</span>
                  <span>RUN PIPELINE</span>
                </>
              )}
            </button>

            {activeFailure && (
              <button
                type="button"
                className="devops-action-btn devops-action-btn--retry"
                onClick={handleRetryStage}
                aria-label={activeFailure.recoveryAction}
              >
                <span aria-hidden="true">↻</span>
                <span>{activeFailure.recoveryAction}</span>
              </button>
            )}

            <button
              type="button"
              className="devops-action-btn devops-action-btn--reset"
              onClick={handleResetPipeline}
              disabled={pipelineState === PIPELINE_STATUS.RUNNING}
              aria-label="Reset pipeline to idle state"
            >
              RESET ↺
            </button>
          </div>

          <div className="devops-highway-controls__meta">
            <span className="devops-highway-controls__stat">
              RELEASE REF: <strong>v1.0.4-prod</strong>
            </span>
            <span className="devops-highway-controls__stat">
              HEALTH CHECK: <strong>AUTOMATED</strong>
            </span>
          </div>
        </div>

        {/* Live Deployment Success Banner */}
        {pipelineState === PIPELINE_STATUS.SUCCESS && (
          <div
            className="devops-success-banner"
            role="status"
            aria-live="polite"
          >
            <div className="devops-success-banner__icon" aria-hidden="true">
              ✓
            </div>
            <div className="devops-success-banner__content">
              <h3 className="devops-success-banner__title">
                PIPELINE SUCCESS // RELEASE DEPLOYED TO LIVE RUNTIME
              </h3>
              <p className="devops-success-banner__desc">
                All six CI/CD stages completed nominal execution. Canary pods verified healthy and
                routing 100% production traffic backed by Cloud District compute &amp; storage nodes. World Health +5 awarded.
              </p>
            </div>
            <span className="devops-success-banner__badge">[ WORLD HEALTH +5 ]</span>
          </div>
        )}

        {/* Pipeline Failure Banner */}
        {activeFailure && (
          <div
            className="devops-failure-banner"
            role="alert"
            aria-live="assertive"
          >
            <div className="devops-failure-banner__icon" aria-hidden="true">
              ⚠️
            </div>
            <div className="devops-failure-banner__content">
              <h3 className="devops-failure-banner__title">
                {activeFailure.code} // {activeFailure.title}
              </h3>
              <p className="devops-failure-banner__desc">
                {activeFailure.errorReason}
              </p>
            </div>
            <button
              type="button"
              className="devops-failure-banner__btn"
              onClick={handleRetryStage}
            >
              EXECUTE RECOVERY &rarr;
            </button>
          </div>
        )}

        {/* Six-Stage Pipeline Highway */}
        <section
          className="pipeline-highway"
          aria-label="Six-Stage Continuous Integration and Deployment Pipeline"
        >
          {/* Conduits between stages */}
          <div className="pipeline-highway__conduits-wrapper" aria-hidden="true">
            <div
              className={`pipeline-highway__flow-line ${
                pipelineState === PIPELINE_STATUS.RUNNING
                  ? 'pipeline-highway__flow-line--active'
                  : pipelineState === PIPELINE_STATUS.SUCCESS
                    ? 'pipeline-highway__flow-line--success'
                    : ''
              }`}
            />
          </div>

          {/* Stage Cards */}
          <div className="pipeline-highway__stages-grid" role="list">
            {PIPELINE_STAGES.map((stage, idx) => {
              const status = stageStates[stage.id]
              const isSelected = selectedStageId === stage.id
              const isRunning = status === STAGE_STATUS.RUNNING
              const isSuccess = status === STAGE_STATUS.SUCCESS
              const isFailed = status === STAGE_STATUS.FAILED

              return (
                <div key={stage.id} className="pipeline-highway__stage-wrapper" role="listitem">
                  <button
                    type="button"
                    id={`pipeline-stage-${stage.id}`}
                    className={`pipeline-node ${
                      isSelected ? 'pipeline-node--selected' : ''
                    } ${
                      isRunning
                        ? 'pipeline-node--running'
                        : isSuccess
                          ? 'pipeline-node--success'
                          : isFailed
                            ? 'pipeline-node--failed'
                            : ''
                    }`}
                    onClick={() => setSelectedStageId(stage.id)}
                    aria-expanded={isSelected}
                    aria-controls={isSelected ? 'pipeline-detail-panel' : undefined}
                    aria-label={`${stage.name} stage: ${stage.title}. Status: ${status}. Click to inspect.`}
                  >
                    <div className="pipeline-node__top">
                      <div className="pipeline-node__glyph-wrapper">
                        <StageGlyph type={stage.iconType} />
                      </div>
                      <span className="pipeline-node__code">{stage.code}</span>
                    </div>

                    <h2 className="pipeline-node__name">{stage.name}</h2>
                    <div className="pipeline-node__title">{stage.title}</div>
                    <p className="pipeline-node__desc">{stage.shortDesc}</p>

                    <div className="pipeline-node__footer">
                      <span
                        className={`pipeline-node__status-pill pipeline-node__status-pill--${status}`}
                      >
                        <span className="pipeline-node__pulse-dot" aria-hidden="true" />
                        {status.toUpperCase()}
                      </span>

                      <span className="pipeline-node__affordance" aria-hidden="true">
                        {isSelected ? 'INSPECTING ▲' : 'INSPECT ▼'}
                      </span>
                    </div>
                  </button>

                  {/* Flow Arrow (between stages in highway) */}
                  {idx < PIPELINE_STAGES.length - 1 && (
                    <div
                      className={`pipeline-highway__arrow ${
                        isSuccess ? 'pipeline-highway__arrow--success' : ''
                      }`}
                      aria-hidden="true"
                    >
                      &rarr;
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        {/* Lower Grid: Stage Technical Inspection HUD & Activity Event Log */}
        <div className="devops-lower-grid">
          {/* Stage Technical Inspection Panel */}
          {selectedStage && (
            <section
              id="pipeline-detail-panel"
              ref={detailPanelRef}
              className="devops-detail"
              aria-labelledby="devops-detail-title"
            >
              <div className="devops-detail__header">
                <div>
                  <div className="devops-detail__meta">
                    <span className="devops-detail__code">{selectedStage.code}</span>
                    <span
                      className={`devops-detail__status-badge devops-detail__status-badge--${
                        stageStates[selectedStage.id]
                      }`}
                    >
                      <span className="devops-detail__status-dot" aria-hidden="true" />
                      STATUS: {stageStates[selectedStage.id].toUpperCase()}
                    </span>
                  </div>
                  <h3 id="devops-detail-title" className="devops-detail__title">
                    {selectedStage.name} // {selectedStage.title}
                  </h3>
                  <p className="devops-detail__purpose">{selectedStage.purpose}</p>
                </div>

                <button
                  type="button"
                  className="devops-detail__close"
                  onClick={() => setSelectedStageId(null)}
                  aria-label={`Close ${selectedStage.name} inspection`}
                >
                  <span aria-hidden="true">&times;</span>
                  <span>CLOSE [ESC]</span>
                </button>
              </div>

              {/* Technical Explanation */}
              <div className="devops-detail__explanation-box">
                <span className="devops-detail__explanation-icon" aria-hidden="true">
                  //
                </span>
                <p className="devops-detail__explanation-text">
                  {selectedStage.technicalExplanation}
                </p>
              </div>

              {/* Stage Failure Diagnostic Banner (if this selected stage has failed) */}
              {activeFailure && activeFailure.stageId === selectedStage.id && (
                <div
                  className="devops-detail__diagnostic"
                  role="region"
                  aria-label="Failure Diagnostics"
                >
                  <div className="devops-detail__diag-header">
                    <span className="devops-detail__diag-code">{activeFailure.code}</span>
                    <span className="devops-detail__diag-title">{activeFailure.title}</span>
                  </div>
                  <p className="devops-detail__diag-reason">{activeFailure.errorReason}</p>
                  <pre className="devops-detail__diag-code-block">{activeFailure.diagnosticDetails}</pre>
                  <div className="devops-detail__diag-actions">
                    <button
                      type="button"
                      className="devops-action-btn devops-action-btn--retry"
                      onClick={handleRetryStage}
                    >
                      <span>↻</span>
                      <span>{activeFailure.recoveryAction}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Stage Simulated Telemetry Metrics Grid */}
              <div className="devops-detail__metrics-section">
                <h4 className="devops-detail__section-title">
                  <span aria-hidden="true">//</span>
                  Stage Execution Metrics &amp; Parameters
                </h4>
                <div className="devops-detail__metrics-grid">
                  {selectedStage.metrics.map((m) => (
                    <div key={m.label} className="devops-detail__metric-card">
                      <span className="devops-detail__metric-label">{m.label}</span>
                      <span className="devops-detail__metric-value">{m.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Real-time Activity / Event Log */}
          <aside
            className="devops-activity-log"
            aria-labelledby="devops-activity-log-title"
          >
            <div className="devops-activity-log__header">
              <div className="devops-activity-log__badge">
                <span className="devops-activity-log__beacon" aria-hidden="true" />
                <h3 id="devops-activity-log-title" className="devops-activity-log__title">
                  PIPELINE TELEMETRY LOG
                </h3>
              </div>
              <span className="devops-activity-log__count">
                {activityLogs.length} EVENTS
              </span>
            </div>

            <div
              className="devops-activity-log__entries"
              role="log"
              aria-live="polite"
              aria-atomic="false"
            >
              {activityLogs.map((entry) => (
                <div key={entry.id} className="devops-activity-log__entry">
                  <span className="devops-activity-log__time">[{entry.time}]</span>
                  <span className="devops-activity-log__text">{entry.text}</span>
                </div>
              ))}
            </div>

            <footer className="devops-activity-log__footer">
              <span className="devops-activity-log__foot-dot" aria-hidden="true">■</span>
              <span>EVENT STREAM: SECURE ENCLAVE IPC</span>
            </footer>
          </aside>
        </div>
      </main>
    </div>
  )
}
