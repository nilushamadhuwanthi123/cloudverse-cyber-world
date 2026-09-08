import React, { useState, useEffect, useRef } from 'react'
import { stagger } from 'animejs'
import {
  WORLD_CANVAS,
  WORLD_DISTRICTS,
  WORLD_CONDUITS,
  findDistrict,
} from './worldMapData'
import {
  getSystemStatus,
  getSystemStatusLevel,
  getSystemStatusMetadata,
} from '../../game/systemHealth'
import {
  DISTRICT_STATUS,
  evaluateDistrictStatus,
  canEnterDistrict,
  getLockReason,
  summarizeProgression,
} from '../../game/districtProgression'
import { clampWorldHealth, INITIAL_WORLD_HEALTH } from '../../game/threatEngine'
import { loadProgress } from '../../services/progressService'
import {
  motionTimeline,
  prefersReducedMotion,
  settleIfReduced,
  stopMotion,
} from '../../lib/motion'
import './WorldMap.css'

/**
 * Schematic SVG Glyphs for World Map Nodes.
 */
function DistrictGlyph({ id }) {
  switch (id) {
    case 'core':
      return (
        <svg
          className="world-node__glyph world-node__glyph--core"
          viewBox="0 0 32 32"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          {/* Hexagonal Outer Frame */}
          <polygon points="16 2 29 9 29 23 16 30 3 23 3 9" />
          {/* Inner Quantum Diamond */}
          <polygon
            points="16 7 24 16 16 25 8 16"
            stroke="var(--cv-cyan)"
            strokeWidth="1.5"
            fill="rgba(0, 229, 255, 0.12)"
          />
          {/* Concentric Energy Core */}
          <circle cx="16" cy="16" r="3.5" fill="var(--cv-ice)" />
        </svg>
      )

    case 'cloud':
      return (
        <svg
          className="world-node__glyph"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
          <line x1="8" y1="13" x2="16" y2="13" />
          <line x1="10" y1="16" x2="14" y2="16" />
        </svg>
      )

    case 'devops':
      return (
        <svg
          className="world-node__glyph"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 12c-2-2.5-4-4-6.5-4a4.5 4.5 0 0 0 0 9c2.5 0 4.5-1.5 6.5-4Z" />
          <path d="M12 12c2 2.5 4 4 6.5 4a4.5 4.5 0 0 0 0-9c-2.5 0-4.5 1.5-6.5 4Z" />
          <circle cx="6" cy="12" r="1.5" fill="currentColor" />
          <circle cx="18" cy="12" r="1.5" fill="currentColor" />
        </svg>
      )

    case 'cyber':
      return (
        <svg
          className="world-node__glyph"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      )

    default:
      return (
        <svg
          className="world-node__glyph"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="8" />
        </svg>
      )
  }
}

/**
 * WorldMap Component.
 *
 * The central spatial navigation environment connecting the districts of CLOUDVERSE.
 *
 * READ-ONLY World Health integration: reads from `progressService.loadProgress()`.
 * Never mutates or invents a duplicate health system.
 */
export default function WorldMap({
  onSelectDistrict,
  initialDistrictId = 'core',
  onExitToIntro,
}) {
  const [selectedId, setSelectedId] = useState(initialDistrictId)
  const [worldHealth, setWorldHealth] = useState(INITIAL_WORLD_HEALTH)
  const [progress, setProgress] = useState(null)
  const [overrides, setOverrides] = useState({})
  const [lockAlertMessage, setLockAlertMessage] = useState(null)
  const [isReady, setIsReady] = useState(prefersReducedMotion)

  const rootRef = useRef(null)
  const timelineRef = useRef(null)
  const inspectorTimelineRef = useRef(null)
  const lockTimeoutRef = useRef(null)

  // Load World Health and progression snapshot on mount (single source of truth)
  useEffect(() => {
    let cancelled = false
    loadProgress().then((saved) => {
      if (cancelled) return
      setProgress(saved)
      if (typeof saved?.worldHealth === 'number') {
        setWorldHealth(clampWorldHealth(saved.worldHealth))
      }
    })
    return () => {
      cancelled = true
      if (lockTimeoutRef.current) {
        clearTimeout(lockTimeoutRef.current)
      }
    }
  }, [])

  // Evaluate dynamic district statuses
  const districtStatuses = {
    core: evaluateDistrictStatus('core', progress, overrides),
    cloud: evaluateDistrictStatus('cloud', progress, overrides),
    devops: evaluateDistrictStatus('devops', progress, overrides),
    cyber: evaluateDistrictStatus('cyber', progress, overrides),
  }

  const progressionSummary = summarizeProgression(districtStatuses)
  const systemStatus = getSystemStatus(worldHealth)
  const systemLevel = getSystemStatusLevel(worldHealth)
  const statusMeta = getSystemStatusMetadata(worldHealth)

  const selectedDistrict = findDistrict(selectedId) || findDistrict('core')
  const selectedStatus = districtStatuses[selectedDistrict.id] || DISTRICT_STATUS.AVAILABLE
  const isSelectedLocked = selectedStatus === DISTRICT_STATUS.LOCKED

  // Entrance animations using Anime.js
  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    const q = (selector) => root.querySelectorAll(selector)

    const tl = motionTimeline({
      defaults: { ease: 'out(3)' },
      onComplete: () => setIsReady(true),
    })

    tl.add(q('.world-map__hud'), {
      opacity: [0, 1],
      y: [-20, 0],
      duration: 500,
    })
      .add(
        q('.world-map__core-node'),
        {
          opacity: [0, 1],
          scale: [0.85, 1],
          duration: 650,
        },
        '-=300'
      )
      .add(
        q('.world-conduit__path'),
        {
          strokeDashoffset: [400, 0],
          opacity: [0, 0.85],
          duration: 700,
          delay: stagger(100),
        },
        '-=400'
      )
      .add(
        q('.world-node:not(.world-map__core-node)'),
        {
          opacity: [0, 1],
          y: [24, 0],
          scale: [0.92, 1],
          duration: 550,
          delay: stagger(120),
        },
        '-=350'
      )
      .add(
        q('.world-map__inspector'),
        {
          opacity: [0, 1],
          x: [24, 0],
          duration: 500,
        },
        '-=250'
      )

    timelineRef.current = tl
    settleIfReduced(tl)

    return () => stopMotion(timelineRef.current)
  }, [])

  // Inspector panel transition on selected district change
  useEffect(() => {
    const root = rootRef.current
    if (!root || !isReady) return

    const panel = root.querySelector('.world-map__inspector-content')
    if (!panel) return

    stopMotion(inspectorTimelineRef.current)

    const tl = motionTimeline({
      defaults: { ease: 'out(3)' },
    })

    tl.add(panel, {
      opacity: [0.35, 1],
      y: [8, 0],
      duration: 320,
    })

    inspectorTimelineRef.current = tl
    settleIfReduced(tl)

    return () => stopMotion(inspectorTimelineRef.current)
  }, [selectedId, isReady])

  // Handles clicking on a district node
  const handleSelectDistrict = (districtId) => {
    setSelectedId(districtId)
    setLockAlertMessage(null)
  }

  // Handles entering a selected district
  const handleEnterDistrict = (districtId) => {
    const targetId = districtId || selectedId
    const status = districtStatuses[targetId]

    if (!canEnterDistrict(status)) {
      const reason = getLockReason(targetId)
      setLockAlertMessage(reason)

      if (lockTimeoutRef.current) {
        clearTimeout(lockTimeoutRef.current)
      }
      lockTimeoutRef.current = setTimeout(() => {
        setLockAlertMessage(null)
      }, 6000)
      return
    }

    // If Core is selected, keep focus on Core diagnostics
    if (targetId === 'core') {
      setSelectedId('core')
      return
    }

    if (typeof onSelectDistrict === 'function') {
      onSelectDistrict(targetId)
    }
  }

  // Quick simulate unlock action for locked district (e.g. Cyber clearance override)
  const handleSimulateUnlock = (districtId) => {
    setOverrides((prev) => ({
      ...prev,
      [districtId]: true,
    }))
    setLockAlertMessage(null)
  }

  // Keyboard navigation across nodes
  const handleKeyDown = (e) => {
    const ids = ['core', 'cloud', 'devops', 'cyber']
    const currentIndex = ids.indexOf(selectedId)

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault()
      const nextIndex = (currentIndex + 1) % ids.length
      setSelectedId(ids[nextIndex])
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault()
      const prevIndex = (currentIndex - 1 + ids.length) % ids.length
      setSelectedId(ids[prevIndex])
    } else if (e.key === 'Enter' && !e.target.closest('.world-map__inspector-btn')) {
      e.preventDefault()
      handleEnterDistrict(selectedId)
    } else if (e.key === 'Escape') {
      setSelectedId('core')
      setLockAlertMessage(null)
    }
  }

  const completedMissionsCount = Array.isArray(progress?.completedMissionIds)
    ? progress.completedMissionIds.length
    : 0

  return (
    <div
      ref={rootRef}
      className={`world-map world-map--level-${systemLevel}`}
      onKeyDown={handleKeyDown}
      role="region"
      aria-label="CLOUDVERSE World Map Sector Hub"
    >
      {/* Background Starfield & Perspective Grid */}
      <div className="world-map__bg" aria-hidden="true">
        <div className="world-map__stars" />
        <div className="world-map__grid" />
        <div className="world-map__ambient-glow" />
      </div>

      {/* Top World Map HUD */}
      <header className="world-map__hud" aria-label="Sector Telemetry HUD">
        <div className="world-map__hud-brand">
          <div className="world-map__hud-core-beacon" aria-hidden="true">
            <span className={`world-map__hud-dot world-map__hud-dot--${systemLevel}`} />
          </div>
          <div>
            <h1 className="world-map__hud-title">CLOUDVERSE // SECTOR MAP</h1>
            <div className="world-map__hud-subtitle">DIGITAL WORLD INTERCONNECT</div>
          </div>
        </div>

        <div className="world-map__hud-metrics">
          {/* World Status Meter */}
          <div
            className="world-map__hud-metric"
            role="status"
            aria-label={`System Status: ${systemStatus}`}
          >
            <span className="world-map__hud-label">SYSTEM STATUS</span>
            <div className={`world-map__status-chip world-map__status-chip--${systemLevel}`}>
              <span className="world-map__status-dot" aria-hidden="true" />
              <span className="world-map__status-text">{systemStatus}</span>
            </div>
          </div>

          {/* World Health Gauge */}
          <div
            className="world-map__hud-metric"
            role="status"
            aria-label={`World Health: ${worldHealth} percent`}
          >
            <div className="world-map__hud-label-row">
              <span className="world-map__hud-label">WORLD HEALTH</span>
              <span className="world-map__hud-val">{worldHealth}%</span>
            </div>
            <div className="world-map__health-track">
              <div
                className={`world-map__health-fill world-map__health-fill--${systemLevel}`}
                style={{ width: `${worldHealth}%` }}
              />
            </div>
          </div>

          {/* Districts Active Counter */}
          <div
            className="world-map__hud-metric world-map__hud-metric--compact"
            role="status"
            aria-label={`Districts: ${progressionSummary.activeCount} of ${progressionSummary.totalCount} active`}
          >
            <span className="world-map__hud-label">DISTRICTS</span>
            <span className="world-map__hud-stat">
              {progressionSummary.activeCount} / {progressionSummary.totalCount} ACTIVE
            </span>
          </div>

          {/* Missions Counter */}
          <div
            className="world-map__hud-metric world-map__hud-metric--compact"
            role="status"
            aria-label={`Missions: ${completedMissionsCount} completed`}
          >
            <span className="world-map__hud-label">MISSIONS</span>
            <span className="world-map__hud-stat">
              {completedMissionsCount} / 4 COMPLETE
            </span>
          </div>
        </div>

        {/* Exit Control */}
        <div className="world-map__hud-controls">
          <button
            type="button"
            className="world-map__hud-exit-btn"
            onClick={onExitToIntro}
            aria-label="Exit World Map to Introduction Screen"
          >
            &larr; Exit to Intro
          </button>
        </div>
      </header>

      {/* Main Spatial Map Area */}
      <section className="world-map__workspace">
        <div className="world-map__canvas-wrapper">
          {/* Scalable SVG Energy Conduits Connecting the World */}
          <svg
            className="world-map__svg-canvas"
            viewBox={`0 0 ${WORLD_CANVAS.width} ${WORLD_CANVAS.height}`}
            preserveAspectRatio="xMidYMid meet"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="coreGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="var(--cv-cyan)" stopOpacity="0.8" />
                <stop offset="50%" stopColor="var(--cv-blue)" stopOpacity="0.4" />
                <stop offset="100%" stopColor="var(--cv-violet)" stopOpacity="0.7" />
              </linearGradient>

              <filter id="conduitGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Render Conduits */}
            {WORLD_CONDUITS.map((conduit) => {
              const fromStatus = districtStatuses[conduit.from]
              const toStatus = districtStatuses[conduit.to]
              const isEnergized =
                fromStatus !== DISTRICT_STATUS.LOCKED && toStatus !== DISTRICT_STATUS.LOCKED

              return (
                <g key={conduit.id} className="world-conduit">
                  {/* Outer glow line */}
                  <path
                    d={conduit.path}
                    className={`world-conduit__glow ${isEnergized ? 'world-conduit__glow--active' : ''}`}
                    stroke={conduit.color}
                    strokeWidth={conduit.isSecondary ? '4' : '6'}
                    fill="none"
                    filter="url(#conduitGlow)"
                  />
                  {/* Core structural line */}
                  <path
                    d={conduit.path}
                    className="world-conduit__base"
                    stroke={conduit.color}
                    strokeWidth={conduit.isSecondary ? '1.5' : '2'}
                    strokeOpacity={isEnergized ? 0.45 : 0.15}
                    fill="none"
                  />
                  {/* Flowing animated energy pulses */}
                  <path
                    d={conduit.path}
                    className={`world-conduit__path ${isEnergized ? 'world-conduit__path--energized' : 'world-conduit__path--dormant'}`}
                    stroke={conduit.color}
                    strokeWidth={conduit.isSecondary ? '2' : '2.5'}
                    strokeDasharray="10 18"
                    fill="none"
                  />
                </g>
              )
            })}
          </svg>

          {/* Spatially Placed District Nodes */}
          <div className="world-map__nodes-layer" role="tablist" aria-label="CLOUDVERSE Districts">
            {WORLD_DISTRICTS.map((district) => {
              const status = districtStatuses[district.id] || DISTRICT_STATUS.AVAILABLE
              const isSelected = selectedId === district.id
              const isLocked = status === DISTRICT_STATUS.LOCKED
              const isCore = district.id === 'core'

              return (
                <div
                  key={district.id}
                  className={`world-node-anchor world-node-anchor--${district.id}`}
                  style={{
                    left: `${district.position.percentX}%`,
                    top: `${district.position.percentY}%`,
                  }}
                >
                  <button
                    type="button"
                    role="tab"
                    id={`district-node-${district.id}`}
                    aria-selected={isSelected}
                    aria-controls="district-inspector-panel"
                    aria-label={`${district.name}, Status: ${status}. ${district.subtitle}`}
                    className={`world-node ${isCore ? 'world-map__core-node' : ''} ${
                      isSelected ? 'world-node--selected' : ''
                    } world-node--status-${status}`}
                    onClick={() => handleSelectDistrict(district.id)}
                    onDoubleClick={() => handleEnterDistrict(district.id)}
                  >
                    {/* Concentric Halo Pulse for Core and Selected */}
                    <div className="world-node__pulse-ring" aria-hidden="true" />

                    <div className="world-node__inner">
                      {/* Sector badge */}
                      <span className="world-node__sector-pill">{district.sectorNumber}</span>

                      {/* District Icon Glyph */}
                      <div className="world-node__glyph-container">
                        <DistrictGlyph id={district.id} />
                      </div>

                      {/* Name and State */}
                      <div className="world-node__meta">
                        <span className="world-node__name">{district.shortName}</span>
                        <div className="world-node__status-indicator">
                          <span
                            className={`world-node__status-dot world-node__status-dot--${status}`}
                            aria-hidden="true"
                          />
                          <span className="world-node__status-label">{status.toUpperCase()}</span>
                        </div>
                      </div>

                      {/* Lock Overlay Badge if Locked */}
                      {isLocked && (
                        <div className="world-node__lock-badge" title="District Locked">
                          <span aria-hidden="true">🔒</span>
                        </div>
                      )}
                    </div>

                    {/* Active Target Ring */}
                    {isSelected && <div className="world-node__reticle" aria-hidden="true" />}
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        {/* District Inspector & Action Panel (Glassmorphic HUD) */}
        <aside
          id="district-inspector-panel"
          className="world-map__inspector"
          role="region"
          aria-labelledby="district-inspector-title"
        >
          <div className="world-map__inspector-content">
            {/* Header / Sector Tag */}
            <div className="world-map__inspector-header">
              <div className="world-map__inspector-tag-row">
                <span className="world-map__inspector-tag">{selectedDistrict.tag}</span>
                <span
                  className={`world-map__inspector-badge world-map__inspector-badge--${selectedStatus}`}
                >
                  <span className="world-map__status-dot" aria-hidden="true" />
                  {selectedStatus.toUpperCase()}
                </span>
              </div>
              <h2 id="district-inspector-title" className="world-map__inspector-title">
                {selectedDistrict.name}
              </h2>
              <p className="world-map__inspector-subtitle">{selectedDistrict.subtitle}</p>
            </div>

            {/* Description */}
            <p className="world-map__inspector-desc">{selectedDistrict.description}</p>

            {/* Subsystems Architecture Matrix */}
            <div className="world-map__subsystems">
              <div className="world-map__subsystems-heading">SUBSYSTEM ARCHITECTURE</div>
              <div className="world-map__subsystems-list">
                {selectedDistrict.subsystems.map((sub) => (
                  <div key={sub.name} className="world-map__subsystem-card">
                    <div className="world-map__subsystem-top">
                      <span className="world-map__subsystem-name">{sub.name}</span>
                      <span className="world-map__subsystem-status">{sub.status}</span>
                    </div>
                    <span className="world-map__subsystem-desc">{sub.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Specifications Matrix */}
            <div className="world-map__specs-row">
              {Object.entries(selectedDistrict.specs).map(([label, val]) => (
                <div key={label} className="world-map__spec-item">
                  <span className="world-map__spec-label">{label.toUpperCase()}</span>
                  <span className="world-map__spec-value">{val}</span>
                </div>
              ))}
            </div>

            {/* Locked Reason Banner */}
            {isSelectedLocked && (
              <div
                className="world-map__lock-alert"
                role="alert"
                aria-live="polite"
              >
                <div className="world-map__lock-alert-icon" aria-hidden="true">
                  🔒
                </div>
                <div className="world-map__lock-alert-text">
                  <strong>SECTOR ACCESS RESTRICTED</strong>
                  <p>{getLockReason(selectedDistrict.id)}</p>
                </div>
              </div>
            )}

            {/* Temporary Lock Warning Message (when user clicked locked button) */}
            {lockAlertMessage && (
              <div className="world-map__lock-toast" role="alert">
                <span>⚠️ {lockAlertMessage}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="world-map__inspector-actions">
              {selectedDistrict.id === 'core' ? (
                <div className="world-map__core-active-badge">
                  <span className="world-map__core-active-dot" aria-hidden="true" />
                  <span>{statusMeta.description}</span>
                </div>
              ) : isSelectedLocked ? (
                <div className="world-map__locked-controls">
                  <button
                    type="button"
                    className="world-map__inspector-btn world-map__inspector-btn--locked"
                    onClick={() => handleEnterDistrict(selectedDistrict.id)}
                    aria-disabled="true"
                  >
                    🔒 ACCESS LOCKED
                  </button>

                  <button
                    type="button"
                    className="world-map__simulate-unlock-btn"
                    onClick={() => handleSimulateUnlock(selectedDistrict.id)}
                    aria-label={`Request clearance to unlock ${selectedDistrict.name}`}
                  >
                    ⚡ Authorize Security Clearance
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="world-map__inspector-btn world-map__inspector-btn--enter"
                  onClick={() => handleEnterDistrict(selectedDistrict.id)}
                  aria-label={`Enter ${selectedDistrict.name}`}
                >
                  <span>{selectedDistrict.actionLabel}</span>
                  <span className="world-map__btn-arrow" aria-hidden="true">
                    &rarr;
                  </span>
                </button>
              )}
            </div>
          </div>
        </aside>
      </section>

      {/* Bottom Status Ticker */}
      <footer className="world-map__ticker" aria-label="System Environmental Broadcast">
        <div className="world-map__ticker-pulse" aria-hidden="true" />
        <span className="world-map__ticker-label">ENVIRONMENTAL TELEMETRY:</span>
        <span className="world-map__ticker-content">
          World Health {worldHealth}% // {statusMeta.status} // {statusMeta.description}
        </span>
      </footer>
    </div>
  )
}
