import { useState, useEffect, useRef, useCallback } from 'react'
import { stagger } from 'animejs'
import { CLOUD_LOCATIONS } from './cloudLocations'
import {
  CLOUD_INCIDENTS,
  INCIDENT_LIFECYCLE,
  findIncident,
  isCorrectIncidentAction,
} from './cloudIncidents'
import { clampWorldHealth, INITIAL_WORLD_HEALTH } from '../../game/threatEngine'
import { loadProgress, saveProgress } from '../../services/progressService'
import { motionTimeline, settleIfReduced, stopMotion } from '../../lib/motion'
import './CloudDistrict.css'

/**
 * Schematic glyph renderer for each location archetype.
 * Pure SVG vectors matching the futuristic technical theme.
 */
function LocationGlyph({ type }) {
  if (type === 'compute') {
    return (
      <svg
        className="cloud-node__glyph"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <rect x="9" y="9" width="6" height="6" />
        <path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3" />
      </svg>
    )
  }

  if (type === 'storage') {
    return (
      <svg
        className="cloud-node__glyph"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <ellipse cx="12" cy="5" rx="9" ry="3" />
        <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
      </svg>
    )
  }

  // Database Lake
  return (
    <svg
      className="cloud-node__glyph"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <ellipse cx="12" cy="6" rx="8" ry="3" />
      <path d="M4 6v6c0 1.66 3.58 3 8 3s8-1.34 8-3V6" />
      <path d="M4 12v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
  )
}

/**
 * Initial operation simulation states for the three sectors (Step 3).
 * Kept purely local to the feature (no localStorage, no global state).
 */
const INITIAL_OPERATIONS = {
  compute: {
    scaleStep: 0, // 0 = 4 instances, 1 = 6 instances, 2 = 8 instances (max)
    status: 'idle', // 'idle' | 'processing' | 'completed'
    message: null,
  },
  storage: {
    optimized: false, // false = 7.4 TB used, true = 6.8 TB used
    status: 'idle',
    message: null,
  },
  database: {
    optimized: false, // false = 128 conns / 2480 QPM, true = 105 conns / 3100 QPM
    status: 'idle',
    message: null,
  },
}

/**
 * Cloud District: Complete End-to-End Experience.
 *
 * Implements:
 * - Step 1: Visual environment, topology conduits, selectable locations, keyboard accessibility.
 * - Step 2: Technical inspection HUD, deep telemetry metrics, hardware fabric, and capabilities.
 * - Step 3: Interactive fictional operations (Scale Up, Optimize Storage, Optimize Database).
 * - Phase 2 (Incidents & World Health): Deterministic cloud incident lifecycle (High Traffic,
 *   Server Failure, Storage Capacity Exhaustion) with World Health integration (+5 / -10).
 */
export default function CloudDistrict({ onBackToIntro }) {
  const [selectedId, setSelectedId] = useState(null)
  const [operations, setOperations] = useState(INITIAL_OPERATIONS)
  const [worldHealth, setWorldHealth] = useState(INITIAL_WORLD_HEALTH)
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false)
  const progressRef = useRef(null)

  // Incident state
  const [incidentState, setIncidentState] = useState({
    incident: null,
    lifecycle: INCIDENT_LIFECYCLE.IDLE,
    rewarded: false,
    penalized: false,
    message: null,
    isProcessing: false,
  })

  const rootRef = useRef(null)
  const timelineRef = useRef(null)
  const detailPanelRef = useRef(null)
  const detailTimelineRef = useRef(null)
  const actionTimelineRef = useRef(null)
  const incidentBannerRef = useRef(null)
  const processingTimerRef = useRef(null)

  const selectedLocation = CLOUD_LOCATIONS.find((loc) => loc.id === selectedId) || null

  // Load World Health and saved progress on mount using the single source of truth (services/progressService)
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

  // Safely update and persist World Health through services/progressService
  const applyWorldHealthDelta = useCallback(
    (delta) => {
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
    },
    []
  )

  const handleSelect = (id) => {
    setSelectedId((prev) => (prev === id ? null : id))
  }

  const handleCloseDetail = useCallback(() => {
    setSelectedId(null)
  }, [])

  // Keyboard shortcut: Escape to close inspection panel or incident simulator
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isSimulatorOpen) {
          setIsSimulatorOpen(false)
        } else if (selectedId) {
          handleCloseDetail()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedId, isSimulatorOpen, handleCloseDetail])

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (processingTimerRef.current) {
        clearTimeout(processingTimerRef.current)
      }
      stopMotion(timelineRef.current)
      stopMotion(detailTimelineRef.current)
      stopMotion(actionTimelineRef.current)
    }
  }, [])

  // Anime.js initial mount entry animation
  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    const q = (selector) => root.querySelectorAll(selector)

    const tl = motionTimeline({
      defaults: { ease: 'out(3)' },
    })

    tl.add(q('.cloud-district__header'), {
      opacity: [0, 1],
      y: [-16, 0],
      duration: 600,
    })
      .add(
        q('.cloud-node'),
        {
          opacity: [0, 1],
          y: [20, 0],
          duration: 500,
          delay: stagger(120),
        },
        '-=300',
      )
      .add(
        q('.cloud-district__conduit-path'),
        {
          opacity: [0, 0.6],
          duration: 400,
        },
        '-=200',
      )

    timelineRef.current = tl
    settleIfReduced(tl)

    return () => stopMotion(timelineRef.current)
  }, [])

  // Anime.js inspection panel entry animation on location select
  useEffect(() => {
    if (!selectedId) return
    const panel = detailPanelRef.current
    if (!panel) return

    stopMotion(detailTimelineRef.current)

    const tl = motionTimeline({
      defaults: { ease: 'out(3)' },
    })

    tl.add(panel, {
      opacity: [0, 1],
      y: [14, 0],
      duration: 320,
    })
      .add(
        panel.querySelectorAll('.cloud-detail__incident-banner, .cloud-detail__action-console'),
        {
          opacity: [0, 1],
          y: [8, 0],
          duration: 280,
        },
        '-=200',
      )
      .add(
        panel.querySelectorAll('.cloud-detail__metric-card'),
        {
          opacity: [0, 1],
          y: [10, 0],
          duration: 300,
          delay: stagger(35),
        },
        '-=180',
      )
      .add(
        panel.querySelectorAll('.cloud-detail__spec-row, .cloud-detail__feature-item'),
        {
          opacity: [0, 1],
          x: [-8, 0],
          duration: 250,
          delay: stagger(20),
        },
        '-=150',
      )

    settleIfReduced(tl)
    detailTimelineRef.current = tl

    return () => stopMotion(detailTimelineRef.current)
  }, [selectedId])

  // Trigger an incident deterministically
  const handleTriggerIncident = (incidentId) => {
    const inc = findIncident(incidentId)
    if (!inc) return

    setIsSimulatorOpen(false)

    // Stop any pending timers
    if (processingTimerRef.current) clearTimeout(processingTimerRef.current)

    setIncidentState({
      incident: inc,
      lifecycle: INCIDENT_LIFECYCLE.DETECTED,
      rewarded: false,
      penalized: false,
      message: `ANOMALY DETECTED: ${inc.title} // AFFECTING ${inc.targetLocationId.toUpperCase()}`,
      isProcessing: false,
    })

    // Advance smoothly from DETECTED to ACTIVE
    setTimeout(() => {
      setIncidentState((prev) => {
        if (prev.lifecycle === INCIDENT_LIFECYCLE.DETECTED) {
          return {
            ...prev,
            lifecycle: INCIDENT_LIFECYCLE.ACTIVE,
            message: `SYSTEM ALERT: ${inc.title} IS ACTIVE. RESPONSE REQUIRED.`,
          }
        }
        return prev
      })
    }, 850)

    // Automatically focus/select target location if not already selected
    setSelectedId(inc.targetLocationId)
  }

  // Handle player response to an active incident
  const handleIncidentResponse = (actionId) => {
    const { incident, lifecycle, isProcessing, rewarded, penalized } = incidentState
    if (!incident || lifecycle !== INCIDENT_LIFECYCLE.ACTIVE || isProcessing) return

    const isCorrect = isCorrectIncidentAction(incident, actionId)

    setIncidentState((prev) => ({
      ...prev,
      isProcessing: true,
      message: isCorrect
        ? 'EXECUTING RESPONSE PROTOCOL & MITIGATING ANOMALY...'
        : 'EXECUTING OVERRIDE INSTRUCTION...',
    }))

    processingTimerRef.current = setTimeout(() => {
      if (isCorrect) {
        // Successful resolution
        if (!rewarded) {
          applyWorldHealthDelta(incident.reward) // +5 World Health
        }

        setIncidentState((prev) => ({
          ...prev,
          lifecycle: INCIDENT_LIFECYCLE.RESOLVED,
          isProcessing: false,
          rewarded: true,
          message: `INCIDENT RESOLVED // ${incident.title} MITIGATED · WORLD HEALTH +${incident.reward}`,
        }))

        // Trigger green celebration pulse animation on panel
        const panel = detailPanelRef.current
        if (panel) {
          const cards = panel.querySelectorAll('.cloud-detail__metric-card')
          stopMotion(actionTimelineRef.current)
          const tl = motionTimeline({ defaults: { ease: 'out(3)' } })
          tl.add(cards, {
            opacity: [0.6, 1],
            y: [-4, 0],
            duration: 400,
            delay: stagger(35),
          })
          settleIfReduced(tl)
          actionTimelineRef.current = tl
        }
      } else {
        // Escalation / failure
        if (!penalized) {
          applyWorldHealthDelta(incident.penalty) // -10 World Health
        }

        setIncidentState((prev) => ({
          ...prev,
          lifecycle: INCIDENT_LIFECYCLE.ESCALATED,
          isProcessing: false,
          penalized: true,
          message: `INCIDENT ESCALATED // UNHANDLED SYSTEM FAULT · WORLD HEALTH ${incident.penalty}`,
        }))
      }
    }, 950)
  }

  // Dismiss resolved/escalated incident and return sector to nominal
  const handleDismissIncident = () => {
    setIncidentState({
      incident: null,
      lifecycle: INCIDENT_LIFECYCLE.IDLE,
      rewarded: false,
      penalized: false,
      message: null,
      isProcessing: false,
    })
  }

  /**
   * Derive dynamic telemetry metrics according to the current operation and incident state.
   */
  const getDynamicLocationData = (loc) => {
    if (!loc) return null

    // Check if an active/resolved incident affects this location
    const { incident, lifecycle } = incidentState
    const isTargetOfIncident = incident && incident.targetLocationId === loc.id

    if (isTargetOfIncident) {
      if (lifecycle === INCIDENT_LIFECYCLE.DETECTED || lifecycle === INCIDENT_LIFECYCLE.ACTIVE) {
        return {
          ...loc,
          status:
            incident.severity === 'critical'
              ? 'CRITICAL // INCIDENT ACTIVE'
              : 'WARNING // STRAINED',
          metrics: incident.activeMetrics,
        }
      }

      if (lifecycle === INCIDENT_LIFECYCLE.RESOLVED) {
        return {
          ...loc,
          status: 'RESOLVED // STABLE',
          metrics: incident.resolvedMetrics,
        }
      }

      if (lifecycle === INCIDENT_LIFECYCLE.ESCALATED) {
        return {
          ...loc,
          status: 'ESCALATED // FAULT UNMITIGATED',
          metrics: incident.activeMetrics,
        }
      }
    }

    // Step 3 standard operational simulations (when not overridden by an active incident)
    if (loc.id === 'compute') {
      const op = operations.compute
      const scaleStep = op.scaleStep

      if (scaleStep === 0) {
        return { ...loc, metrics: loc.baseMetrics }
      }

      if (scaleStep === 1) {
        return {
          ...loc,
          status: 'ACTIVE // SCALED (+2)',
          metrics: [
            {
              id: 'cpu-usage',
              label: 'CPU Usage',
              value: '48%',
              percent: 48,
              statusVariant: 'stable',
              type: 'gauge',
              isModified: true,
            },
            {
              id: 'memory-usage',
              label: 'Memory Usage',
              value: '59%',
              percent: 59,
              statusVariant: 'stable',
              type: 'gauge',
              isModified: true,
            },
            {
              id: 'active-instances',
              label: 'Active Instances',
              value: '6',
              subValue: 'Cluster nodes online (+2 provisioned)',
              statusVariant: 'stable',
              type: 'counter',
              isModified: true,
            },
            {
              id: 'request-load',
              label: 'Request Load',
              value: '980 req/min',
              subValue: 'Load distributed across 6 nodes',
              statusVariant: 'stable',
              type: 'rate',
              isModified: true,
            },
            {
              id: 'instance-status',
              label: 'Instance Status',
              value: 'ONLINE',
              statusVariant: 'stable',
              type: 'status',
            },
            {
              id: 'scaling-state',
              label: 'Scaling State',
              value: 'SCALING COMPLETE',
              statusVariant: 'stable',
              type: 'status',
              isModified: true,
            },
          ],
        }
      }

      // Max capacity (scaleStep >= 2)
      return {
        ...loc,
        status: 'ACTIVE // MAX CAPACITY',
        metrics: [
          {
            id: 'cpu-usage',
            label: 'CPU Usage',
            value: '36%',
            percent: 36,
            statusVariant: 'stable',
            type: 'gauge',
            isModified: true,
          },
          {
            id: 'memory-usage',
            label: 'Memory Usage',
            value: '49%',
            percent: 49,
            statusVariant: 'stable',
            type: 'gauge',
            isModified: true,
          },
          {
            id: 'active-instances',
            label: 'Active Instances',
            value: '8',
            subValue: 'Cluster nodes online (Enclave limit)',
            statusVariant: 'stable',
            type: 'counter',
            isModified: true,
          },
          {
            id: 'request-load',
            label: 'Request Load',
            value: '740 req/min',
            subValue: 'High redundancy distributed mesh',
            statusVariant: 'stable',
            type: 'rate',
            isModified: true,
          },
          {
            id: 'instance-status',
            label: 'Instance Status',
            value: 'ONLINE',
            statusVariant: 'stable',
            type: 'status',
          },
          {
            id: 'scaling-state',
            label: 'Scaling State',
            value: 'MAX CLUSTER CAPACITY',
            statusVariant: 'stable',
            type: 'status',
            isModified: true,
          },
        ],
      }
    }

    if (loc.id === 'storage') {
      const op = operations.storage
      if (!op.optimized) {
        return { ...loc, metrics: loc.baseMetrics }
      }

      return {
        ...loc,
        status: 'OPTIMIZED // DEDUPLICATED',
        metrics: [
          {
            id: 'total-capacity',
            label: 'Total Capacity',
            value: '12 TB',
            subValue: 'Tiered NVMe array',
            statusVariant: 'stable',
            type: 'metric',
          },
          {
            id: 'used-capacity',
            label: 'Used Capacity',
            value: '6.8 TB',
            percent: 56.7,
            subValue: '56.7% utilized · 600 GB reclaimed',
            statusVariant: 'stable',
            type: 'gauge',
            isModified: true,
          },
          {
            id: 'available-capacity',
            label: 'Available Capacity',
            value: '5.2 TB',
            percent: 43.3,
            subValue: '43.3% unallocated (+600 GB)',
            statusVariant: 'stable',
            type: 'metric',
            isModified: true,
          },
          {
            id: 'storage-type',
            label: 'Storage Type',
            value: 'OBJECT STORAGE',
            subValue: 'Multi-region bucket mesh',
            statusVariant: 'stable',
            type: 'badge',
          },
          {
            id: 'read-activity',
            label: 'Read Activity',
            value: '840 ops/min',
            subValue: 'Sustained throughput',
            statusVariant: 'stable',
            type: 'rate',
          },
          {
            id: 'write-activity',
            label: 'Write Activity',
            value: '310 ops/min',
            subValue: 'Synchronous commit pool',
            statusVariant: 'stable',
            type: 'rate',
          },
          {
            id: 'storage-status',
            label: 'Storage Status',
            value: 'HEALTHY',
            statusVariant: 'stable',
            type: 'status',
            isModified: true,
          },
        ],
      }
    }

    if (loc.id === 'database') {
      const op = operations.database
      if (!op.optimized) {
        return { ...loc, metrics: loc.baseMetrics }
      }

      return {
        ...loc,
        status: 'OPTIMIZED // HIGH THROUGHPUT',
        metrics: [
          {
            id: 'database-engine',
            label: 'Database Engine',
            value: 'CLOUD SQL',
            subValue: 'High-availability cluster',
            statusVariant: 'stable',
            type: 'badge',
          },
          {
            id: 'active-connections',
            label: 'Active Connections',
            value: '105',
            percent: 21.0,
            subValue: '105 / 500 pool limit (pruned)',
            statusVariant: 'stable',
            type: 'gauge',
            isModified: true,
          },
          {
            id: 'query-rate',
            label: 'Query Rate',
            value: '3,100 queries/min',
            subValue: '~51.7 QPS sustained (+25% gain)',
            statusVariant: 'stable',
            type: 'rate',
            isModified: true,
          },
          {
            id: 'replication-status',
            label: 'Replication Status',
            value: 'SYNCHRONIZED',
            statusVariant: 'stable',
            type: 'status',
          },
          {
            id: 'storage-usage',
            label: 'Storage Usage',
            value: '68%',
            percent: 68,
            subValue: '340 GB / 500 GB provisioned',
            statusVariant: 'warning',
            type: 'gauge',
          },
          {
            id: 'database-health',
            label: 'Database Health',
            value: 'OPTIMIZED',
            statusVariant: 'stable',
            type: 'status',
            isModified: true,
          },
        ],
      }
    }

    return loc
  }

  const activeLocation = getDynamicLocationData(selectedLocation)

  /**
   * Step 3: Trigger the operational simulation when no incident is active.
   */
  const handleTriggerOperation = (locationId) => {
    const currentOp = operations[locationId]
    if (!currentOp || currentOp.status === 'processing') return

    // Prevent unreasonable repeated operations
    if (locationId === 'compute' && currentOp.scaleStep >= 2) return
    if (locationId === 'storage' && currentOp.optimized) return
    if (locationId === 'database' && currentOp.optimized) return

    // Set processing status
    let processingMsg = 'EXECUTING INSTRUCTION...'
    if (locationId === 'compute') processingMsg = 'ORCHESTRATING CONTAINER NODES...'
    if (locationId === 'storage') processingMsg = 'COMPACTING STORAGE VAULTS & DEDUPLICATING...'
    if (locationId === 'database') processingMsg = 'REBUILDING QUERY INDEXES & PRUNING THREADS...'

    setOperations((prev) => ({
      ...prev,
      [locationId]: {
        ...prev[locationId],
        status: 'processing',
        message: processingMsg,
      },
    }))

    // Anime.js processing feedback animation on the action button
    const panel = detailPanelRef.current
    if (panel) {
      const actionBtn = panel.querySelector('.cloud-detail__action-btn')
      if (actionBtn) {
        stopMotion(actionTimelineRef.current)
        const tl = motionTimeline({ defaults: { ease: 'inOut(2)' } })
        tl.add(actionBtn, {
          scale: [1, 0.97, 1],
          duration: 300,
        })
        settleIfReduced(tl)
        actionTimelineRef.current = tl
      }
    }

    // Process operation after a short realistic simulation duration (~950ms)
    processingTimerRef.current = setTimeout(() => {
      let completeMsg = 'OPERATION COMPLETE'

      setOperations((prev) => {
        if (locationId === 'compute') {
          const nextStep = prev.compute.scaleStep + 1
          completeMsg =
            nextStep >= 2
              ? 'MAX CAPACITY REACHED // 8 INSTANCES ONLINE'
              : 'SCALING COMPLETE // +2 NODES PROVISIONED'
          return {
            ...prev,
            compute: {
              scaleStep: nextStep,
              status: 'completed',
              message: completeMsg,
            },
          }
        }

        if (locationId === 'storage') {
          completeMsg = 'OPTIMIZATION COMPLETE // 600 GB CAPACITY RECLAIMED'
          return {
            ...prev,
            storage: {
              optimized: true,
              status: 'completed',
              message: completeMsg,
            },
          }
        }

        if (locationId === 'database') {
          completeMsg = 'OPTIMIZATION COMPLETE // +620 QUERIES/MIN THROUGHPUT GAIN'
          return {
            ...prev,
            database: {
              optimized: true,
              status: 'completed',
              message: completeMsg,
            },
          }
        }

        return prev
      })

      // Anime.js telemetry cards update pulse animation
      if (panel) {
        const modifiedCards = panel.querySelectorAll('.cloud-detail__metric-card--modified')
        if (modifiedCards && modifiedCards.length > 0) {
          stopMotion(actionTimelineRef.current)
          const tl = motionTimeline({ defaults: { ease: 'out(3)' } })
          tl.add(modifiedCards, {
            opacity: [0.6, 1],
            y: [-3, 0],
            duration: 400,
            delay: stagger(40),
          })
          settleIfReduced(tl)
          actionTimelineRef.current = tl
        }
      }

      // Return to stable state after displaying completion badge
      setTimeout(() => {
        setOperations((prev) => ({
          ...prev,
          [locationId]: {
            ...prev[locationId],
            status: 'idle',
          },
        }))
      }, 2400)
    }, 950)
  }

  /**
   * Reset the current location's simulated operation back to nominal state.
   */
  const handleResetOperation = (locationId) => {
    setOperations((prev) => ({
      ...prev,
      [locationId]: {
        scaleStep: 0,
        optimized: false,
        status: 'idle',
        message: 'SECTOR TELEMETRY RESET TO BASELINE NOMINAL',
      },
    }))

    setTimeout(() => {
      setOperations((prev) => ({
        ...prev,
        [locationId]: {
          ...prev[locationId],
          message: null,
        },
      }))
    }, 2000)
  }

  // Active incident details if affecting selected sector
  const activeIncident = incidentState.incident
  const isSelectedIncidentTarget =
    activeIncident && activeIncident.targetLocationId === selectedId
  const isIncidentActiveOrDetected =
    incidentState.lifecycle === INCIDENT_LIFECYCLE.DETECTED ||
    incidentState.lifecycle === INCIDENT_LIFECYCLE.ACTIVE
  const isIncidentResolved = incidentState.lifecycle === INCIDENT_LIFECYCLE.RESOLVED
  const isIncidentEscalated = incidentState.lifecycle === INCIDENT_LIFECYCLE.ESCALATED

  return (
    <div ref={rootRef} className="cloud-district">
      {/* Visual background layers */}
      <div className="cloud-district__grid-bg" aria-hidden="true" />
      <div className="cloud-district__ambient-glow" aria-hidden="true" />

      {/* Top HUD Telemetry Navigation & World Health */}
      <header className="cloud-district__hud">
        <div className="cloud-district__hud-left">
          <div className="cloud-district__hud-badge">
            <span className="cloud-district__beacon-dot" aria-hidden="true" />
            <span>DISTRICT // 01: CLOUD</span>
          </div>

          {/* Living World Health Integration */}
          <div
            className="cloud-district__health-badge"
            role="status"
            aria-label={`World Health: ${worldHealth}%`}
          >
            <span
              className={`cloud-district__health-beacon ${
                worldHealth < 50
                  ? 'cloud-district__health-beacon--critical'
                  : worldHealth < 80
                    ? 'cloud-district__health-beacon--warning'
                    : ''
              }`}
              aria-hidden="true"
            />
            <span className="cloud-district__health-label">
              WORLD HEALTH: <strong>{worldHealth}%</strong>
            </span>
            <div className="cloud-district__health-track" aria-hidden="true">
              <div
                className={`cloud-district__health-fill ${
                  worldHealth < 50
                    ? 'cloud-district__health-fill--critical'
                    : worldHealth < 80
                      ? 'cloud-district__health-fill--warning'
                      : ''
                }`}
                style={{ width: `${worldHealth}%` }}
              />
            </div>
          </div>

          <span className="cloud-district__hud-status">
            TOPOLOGY: STABLE · REGION: GLOBAL MESH
          </span>
        </div>

        <div className="cloud-district__hud-actions">
          {/* Incident Drill Simulation Trigger */}
          <div className="cloud-district__simulator-wrapper">
            <button
              type="button"
              id="simulate-incident-btn"
              className={`cloud-district__simulator-btn ${
                incidentState.lifecycle !== INCIDENT_LIFECYCLE.IDLE
                  ? 'cloud-district__simulator-btn--active'
                  : ''
              }`}
              onClick={() => setIsSimulatorOpen((prev) => !prev)}
              aria-expanded={isSimulatorOpen}
              aria-controls="cloud-simulator-menu"
              aria-label="Toggle Incident Simulation Drill Menu"
            >
              <span aria-hidden="true">⚠️</span>
              <span>SIMULATE INCIDENT ▼</span>
            </button>

            {isSimulatorOpen && (
              <div
                id="cloud-simulator-menu"
                className="cloud-district__simulator-menu"
                role="menu"
                aria-label="Select Cloud Incident Simulation"
              >
                <div className="cloud-district__simulator-menu-header">
                  <span>INCIDENT DRILL PROTOCOLS</span>
                </div>
                {CLOUD_INCIDENTS.map((inc) => (
                  <button
                    key={inc.id}
                    type="button"
                    role="menuitem"
                    className="cloud-district__simulator-menu-item"
                    onClick={() => handleTriggerIncident(inc.id)}
                  >
                    <span className="cloud-district__sim-item-code">{inc.code}</span>
                    <span className="cloud-district__sim-item-title">{inc.title}</span>
                    <span className="cloud-district__sim-item-target">
                      [{inc.targetLocationId.toUpperCase()}]
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {onBackToIntro && (
            <button
              type="button"
              className="cloud-district__nav-btn"
              onClick={onBackToIntro}
            >
              &larr; UPLINK TERMINAL
            </button>
          )}
        </div>
      </header>

      {/* Global Incident Notification Broadcast Banner */}
      {incidentState.lifecycle !== INCIDENT_LIFECYCLE.IDLE && activeIncident && (
        <aside
          ref={incidentBannerRef}
          className={`cloud-incident-alert ${
            isIncidentResolved
              ? 'cloud-incident-alert--resolved'
              : isIncidentEscalated
                ? 'cloud-incident-alert--escalated'
                : 'cloud-incident-alert--active'
          }`}
          role="alert"
          aria-live="assertive"
        >
          <div className="cloud-incident-alert__content">
            <span className="cloud-incident-alert__pulse-icon" aria-hidden="true">
              {isIncidentResolved ? '✓' : isIncidentEscalated ? '✕' : '⚠️'}
            </span>
            <div className="cloud-incident-alert__body">
              <div className="cloud-incident-alert__header-row">
                <span className="cloud-incident-alert__code">{activeIncident.code}</span>
                <span className="cloud-incident-alert__title">{activeIncident.title}</span>
                <span className="cloud-incident-alert__target">
                  TARGET: SECTOR {activeIncident.targetLocationId.toUpperCase()}
                </span>
              </div>
              <p className="cloud-incident-alert__msg">{incidentState.message}</p>
            </div>
          </div>

          <div className="cloud-incident-alert__actions">
            {selectedId !== activeIncident.targetLocationId && (
              <button
                type="button"
                className="cloud-incident-alert__jump-btn"
                onClick={() => setSelectedId(activeIncident.targetLocationId)}
              >
                JUMP TO SECTOR &rarr;
              </button>
            )}

            {(isIncidentResolved || isIncidentEscalated) && (
              <button
                type="button"
                className="cloud-incident-alert__dismiss-btn"
                onClick={handleDismissIncident}
                aria-label="Dismiss incident notification"
              >
                DISMISS &times;
              </button>
            )}
          </div>
        </aside>
      )}

      {/* Main World Canvas */}
      <main className="cloud-district__canvas">
        {/* District Title Header */}
        <header className="cloud-district__header">
          <span className="cloud-district__tag">Digital Territory</span>
          <h1 className="cloud-district__title">Cloud District</h1>
          <p className="cloud-district__subtitle">
            The foundational infrastructure realm of CLOUDVERSE. Discover the three
            interconnected nodes powering distributed computation, persistent storage,
            and transactional data flow.
          </p>
        </header>

        {/* Topology Network */}
        <div className="cloud-district__topology">
          {/* SVG Conduits interconnecting the three locations */}
          <svg
            className="cloud-district__conduits-svg"
            viewBox="0 0 1000 300"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              d="M 166 120 C 333 40, 333 40, 500 120"
              className={`cloud-district__conduit-path ${
                selectedId === 'compute' || selectedId === 'storage'
                  ? 'cloud-district__conduit-path--active'
                  : ''
              }`}
            />
            <path
              d="M 500 120 C 666 40, 666 40, 833 120"
              className={`cloud-district__conduit-path ${
                selectedId === 'storage' || selectedId === 'database'
                  ? 'cloud-district__conduit-path--active'
                  : ''
              }`}
            />
            <path
              d="M 166 120 C 500 240, 500 240, 833 120"
              className={`cloud-district__conduit-path ${
                selectedId === 'compute' || selectedId === 'database'
                  ? 'cloud-district__conduit-path--active'
                  : ''
              }`}
            />
          </svg>

          {/* Core Nexus Anchor */}
          <div className="cloud-district__nexus-indicator" aria-hidden="true">
            <span className="cloud-district__nexus-core-icon" />
            <span>CENTRAL FABRIC CONDUIT</span>
          </div>

          {/* Three Discoverable Locations */}
          <div
            className="cloud-district__locations-grid"
            role="region"
            aria-label="Cloud District Locations"
          >
            {CLOUD_LOCATIONS.map((loc) => {
              const isSelected = selectedId === loc.id
              const locOp = operations[loc.id]
              const isOperated = locOp && (locOp.scaleStep > 0 || locOp.optimized)
              const hasIncident =
                activeIncident &&
                activeIncident.targetLocationId === loc.id &&
                isIncidentActiveOrDetected

              return (
                <button
                  key={loc.id}
                  type="button"
                  id={`location-node-${loc.id}`}
                  className={`cloud-node ${isSelected ? 'cloud-node--selected' : ''} ${
                    hasIncident ? 'cloud-node--incident' : ''
                  }`}
                  onClick={() => handleSelect(loc.id)}
                  aria-expanded={isSelected}
                  aria-controls={isSelected ? 'cloud-detail-panel' : undefined}
                  aria-label={`${loc.title} - ${loc.subtitle}. ${
                    hasIncident ? 'Incident detected!' : ''
                  } Click to inspect sector.`}
                >
                  <div className="cloud-node__top">
                    <div className="cloud-node__glyph-wrapper">
                      <LocationGlyph type={loc.iconType} />
                    </div>
                    <span className="cloud-node__code-badge">{loc.code}</span>
                  </div>

                  <h2 className="cloud-node__title">{loc.title}</h2>
                  <div className="cloud-node__subtitle">{loc.subtitle}</div>
                  <p className="cloud-node__desc">{loc.description}</p>

                  <div className="cloud-node__footer">
                    <div className="cloud-node__indicator">
                      <span
                        className={`cloud-node__pulse ${
                          hasIncident ? 'cloud-node__pulse--danger' : ''
                        }`}
                        aria-hidden="true"
                      />
                      <span>
                        {hasIncident
                          ? '[ ⚠️ INCIDENT ACTIVE ]'
                          : isSelected
                            ? '[ ACTIVE SECTOR ]'
                            : isOperated
                              ? '[ MODIFIED // ACTIVE ]'
                              : '[ STANDBY ]'}
                      </span>
                    </div>

                    <span className="cloud-node__affordance" aria-hidden="true">
                      {isSelected ? 'INSPECTING ▲' : 'INSPECT ▼'}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Location Detail Inspection Panel (Futuristic Cloud Infrastructure HUD) */}
        {activeLocation && (
          <section
            id="cloud-detail-panel"
            ref={detailPanelRef}
            className="cloud-detail"
            aria-labelledby="cloud-detail-title"
          >
            {/* Header: Title, Sector Metadata & Close Control */}
            <div className="cloud-detail__header">
              <div className="cloud-detail__header-info">
                <div className="cloud-detail__meta">
                  <span className="cloud-detail__code">{activeLocation.code}</span>
                  <span className="cloud-detail__coords">
                    {activeLocation.coordinates}
                  </span>
                  <span className="cloud-detail__badge">
                    {activeLocation.badge}
                  </span>
                  <span
                    className={`cloud-detail__status-tag ${
                      isSelectedIncidentTarget && isIncidentActiveOrDetected
                        ? 'cloud-detail__status-tag--danger'
                        : ''
                    }`}
                  >
                    <span
                      className={`cloud-detail__status-beacon ${
                        isSelectedIncidentTarget && isIncidentActiveOrDetected
                          ? 'cloud-detail__status-beacon--danger'
                          : ''
                      }`}
                      aria-hidden="true"
                    />
                    {activeLocation.status}
                  </span>
                </div>
                <h3 id="cloud-detail-title" className="cloud-detail__title">
                  {activeLocation.title}
                </h3>
                <p className="cloud-detail__subtitle">{activeLocation.subtitle}</p>
              </div>

              <button
                type="button"
                className="cloud-detail__close"
                onClick={handleCloseDetail}
                aria-label={`Close ${activeLocation.title} inspection`}
              >
                <span aria-hidden="true">&times;</span>
                <span>CLOSE [ESC]</span>
              </button>
            </div>

            {/* PHASE 2: Incident Response Action Console (when an incident is targeting this location) */}
            {isSelectedIncidentTarget && isIncidentActiveOrDetected && (
              <div
                className="cloud-detail__incident-banner"
                role="region"
                aria-labelledby="incident-response-title"
              >
                <div className="cloud-detail__incident-header">
                  <div className="cloud-detail__incident-badge">
                    <span className="cloud-detail__incident-dot" aria-hidden="true" />
                    <span>ANOMALY PROTOCOL // ACTIVE THREAT</span>
                  </div>
                  <span className="cloud-detail__incident-impact">
                    {activeIncident.impactSummary}
                  </span>
                </div>

                <div className="cloud-detail__incident-body">
                  <h4 id="incident-response-title" className="cloud-detail__incident-title">
                    {activeIncident.title}
                  </h4>
                  <p className="cloud-detail__incident-desc">
                    {activeIncident.description}
                  </p>
                </div>

                <div className="cloud-detail__incident-actions">
                  {/* Correct Response Action Button */}
                  <button
                    type="button"
                    className="cloud-detail__incident-btn cloud-detail__incident-btn--correct"
                    onClick={() => handleIncidentResponse(activeIncident.correctActionId)}
                    disabled={incidentState.isProcessing}
                    aria-busy={incidentState.isProcessing}
                    aria-label={`Execute ${activeIncident.correctActionLabel} to resolve ${activeIncident.title}`}
                  >
                    {incidentState.isProcessing ? (
                      <>
                        <span className="cloud-detail__spinner" aria-hidden="true" />
                        <span>PROCESSING RESPONSE...</span>
                      </>
                    ) : (
                      <>
                        <span className="cloud-detail__btn-icon" aria-hidden="true">
                          ▶
                        </span>
                        <span>{activeIncident.correctActionLabel}</span>
                        <span className="cloud-detail__reward-tag">[ +5 HEALTH ]</span>
                      </>
                    )}
                  </button>

                  {/* Incorrect / Escalation Action Button */}
                  <button
                    type="button"
                    className="cloud-detail__incident-btn cloud-detail__incident-btn--escalate"
                    onClick={() => handleIncidentResponse(activeIncident.incorrectActionId)}
                    disabled={incidentState.isProcessing}
                    aria-label={`Execute ${activeIncident.incorrectActionLabel} (Escalates incident)`}
                  >
                    <span aria-hidden="true">✕</span>
                    <span>{activeIncident.incorrectActionLabel}</span>
                    <span className="cloud-detail__penalty-tag">[ -10 HEALTH ]</span>
                  </button>
                </div>
              </div>
            )}

            {/* PHASE 2: Resolution / Escalation Feedback Console */}
            {isSelectedIncidentTarget && (isIncidentResolved || isIncidentEscalated) && (
              <div
                className={`cloud-detail__incident-outcome ${
                  isIncidentResolved
                    ? 'cloud-detail__incident-outcome--resolved'
                    : 'cloud-detail__incident-outcome--escalated'
                }`}
                role="status"
              >
                <div className="cloud-detail__outcome-icon" aria-hidden="true">
                  {isIncidentResolved ? '✓' : '✕'}
                </div>
                <div className="cloud-detail__outcome-body">
                  <h4 className="cloud-detail__outcome-title">
                    {isIncidentResolved
                      ? 'INCIDENT RESOLUTION CONFIRMED'
                      : 'INCIDENT ESCALATION LOGGED'}
                  </h4>
                  <p className="cloud-detail__outcome-msg">{incidentState.message}</p>
                </div>
                <button
                  type="button"
                  className="cloud-detail__dismiss-btn"
                  onClick={handleDismissIncident}
                >
                  RESTORE NORMAL HUD &times;
                </button>
              </div>
            )}

            {/* STEP 3: Standard Interactive Cloud-Operation Console (when no active incident targets this sector) */}
            {(!isSelectedIncidentTarget || (!isIncidentActiveOrDetected && !isIncidentResolved && !isIncidentEscalated)) &&
              (() => {
                const op = operations[activeLocation.id]
                const isProcessing = op.status === 'processing'

                // Determine limits to prevent infinite operations
                let isMaxed = false
                let actionBtnText = activeLocation.actionConfig.label

                if (activeLocation.id === 'compute') {
                  if (op.scaleStep === 0) {
                    actionBtnText = 'SCALE UP (+2 NODES)'
                  } else if (op.scaleStep === 1) {
                    actionBtnText = 'SCALE UP (+2 TO MAX)'
                  } else {
                    isMaxed = true
                    actionBtnText = 'MAX CLUSTER CAPACITY (8/8)'
                  }
                } else if (activeLocation.id === 'storage') {
                  if (op.optimized) {
                    isMaxed = true
                    actionBtnText = 'STORAGE OPTIMIZED'
                  } else {
                    actionBtnText = 'OPTIMIZE STORAGE'
                  }
                } else if (activeLocation.id === 'database') {
                  if (op.optimized) {
                    isMaxed = true
                    actionBtnText = 'DATABASE OPTIMIZED'
                  } else {
                    actionBtnText = 'OPTIMIZE DATABASE'
                  }
                }

                const hasModifications = op.scaleStep > 0 || op.optimized

                return (
                  <div className="cloud-detail__action-console">
                    <div className="cloud-detail__action-info">
                      <div className="cloud-detail__action-meta">
                        <span className="cloud-detail__action-tag">
                          OPERATIONAL SIMULATION // STEP 3
                        </span>
                        {op.message && (
                          <span
                            className={`cloud-detail__action-status-msg ${
                              isProcessing
                                ? 'cloud-detail__action-status-msg--busy'
                                : ''
                            }`}
                            role="status"
                            aria-live="polite"
                          >
                            {op.message}
                          </span>
                        )}
                      </div>
                      <p className="cloud-detail__action-desc">
                        {activeLocation.actionConfig.description}
                      </p>
                    </div>

                    <div className="cloud-detail__action-controls">
                      <button
                        type="button"
                        className={`cloud-detail__action-btn ${
                          isProcessing ? 'cloud-detail__action-btn--processing' : ''
                        } ${isMaxed ? 'cloud-detail__action-btn--maxed' : ''}`}
                        onClick={() => handleTriggerOperation(activeLocation.id)}
                        disabled={isProcessing || isMaxed}
                        aria-busy={isProcessing}
                        aria-label={`${actionBtnText} for ${activeLocation.title}`}
                      >
                        {isProcessing ? (
                          <>
                            <span
                              className="cloud-detail__spinner"
                              aria-hidden="true"
                            />
                            <span>{activeLocation.actionConfig.activeLabel}</span>
                          </>
                        ) : isMaxed ? (
                          <>
                            <span
                              className="cloud-detail__btn-icon"
                              aria-hidden="true"
                            >
                              ✓
                            </span>
                            <span>{actionBtnText}</span>
                          </>
                        ) : (
                          <>
                            <span
                              className="cloud-detail__btn-icon"
                              aria-hidden="true"
                            >
                              ▶
                            </span>
                            <span>{actionBtnText}</span>
                          </>
                        )}
                      </button>

                      {hasModifications && (
                        <button
                          type="button"
                          className="cloud-detail__reset-btn"
                          onClick={() => handleResetOperation(activeLocation.id)}
                          disabled={isProcessing}
                          aria-label={`Reset ${activeLocation.title} to baseline nominal telemetry`}
                        >
                          RESET BASELINE ↺
                        </button>
                      )}
                    </div>
                  </div>
                )
              })()}

            {/* Primary Section: Real-Time Telemetry Metrics */}
            <div className="cloud-detail__telemetry-section">
              <div className="cloud-detail__section-header">
                <h4 className="cloud-detail__section-title">
                  <span className="cloud-detail__section-icon" aria-hidden="true">
                    //
                  </span>
                  Technical Telemetry &amp; Metrics
                </h4>
                <div className="cloud-detail__live-indicator">
                  <span className="cloud-detail__pulse-dot" aria-hidden="true" />
                  <span>LIVE TELEMETRY BUS</span>
                </div>
              </div>

              <div className="cloud-detail__metrics-grid">
                {activeLocation.metrics.map((metric) => (
                  <div
                    key={metric.label}
                    className={`cloud-detail__metric-card ${
                      metric.isModified ? 'cloud-detail__metric-card--modified' : ''
                    } ${
                      metric.statusVariant === 'critical'
                        ? 'cloud-detail__metric-card--critical'
                        : metric.statusVariant === 'warning'
                          ? 'cloud-detail__metric-card--warning'
                          : ''
                    }`}
                  >
                    <div className="cloud-detail__metric-header">
                      <span className="cloud-detail__metric-label">
                        {metric.label}
                      </span>
                      {metric.type === 'status' && (
                        <span
                          className={`cloud-detail__status-pill cloud-detail__status-pill--${
                            metric.statusVariant || 'stable'
                          }`}
                        >
                          <span
                            className="cloud-detail__pulse-dot"
                            aria-hidden="true"
                          />
                          {metric.value}
                        </span>
                      )}
                    </div>

                    <div className="cloud-detail__metric-body">
                      <div className="cloud-detail__metric-value">
                        {metric.value}
                      </div>
                      {metric.subValue && (
                        <div className="cloud-detail__metric-sub">
                          {metric.subValue}
                        </div>
                      )}
                    </div>

                    {metric.percent !== undefined && (
                      <div
                        className="cloud-detail__progress"
                        role="progressbar"
                        aria-valuenow={metric.percent}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`${metric.label}: ${metric.percent}%`}
                      >
                        <div
                          className={`cloud-detail__progress-fill ${
                            metric.statusVariant === 'critical'
                              ? 'cloud-detail__progress-fill--critical'
                              : metric.statusVariant === 'warning'
                                ? 'cloud-detail__progress-fill--warning'
                                : ''
                          }`}
                          style={{ width: `${metric.percent}%` }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Secondary Section: Deep Infrastructure Subsystems & Capabilities */}
            <div className="cloud-detail__subsystems-grid">
              {/* Technical Specifications */}
              <div className="cloud-detail__subsystem-col">
                <h4 className="cloud-detail__section-title">
                  <span className="cloud-detail__section-icon" aria-hidden="true">
                    //
                  </span>
                  Hardware Fabric &amp; Architecture
                </h4>
                <div className="cloud-detail__specs-list">
                  {activeLocation.technicalSpecs.map((spec) => (
                    <div key={spec.label} className="cloud-detail__spec-row">
                      <span className="cloud-detail__spec-label">{spec.label}</span>
                      <span className="cloud-detail__spec-value">{spec.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Architectural Capabilities */}
              <div className="cloud-detail__subsystem-col">
                <h4 className="cloud-detail__section-title">
                  <span className="cloud-detail__section-icon" aria-hidden="true">
                    //
                  </span>
                  Architectural Capabilities
                </h4>
                <ul className="cloud-detail__features-list">
                  {activeLocation.features.map((feat) => (
                    <li key={feat} className="cloud-detail__feature-item">
                      <span
                        className="cloud-detail__feature-bullet"
                        aria-hidden="true"
                      >
                        &gt;
                      </span>
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* HUD Status Bar Footer */}
            <footer className="cloud-detail__footer">
              <div className="cloud-detail__footer-item">
                <span className="cloud-detail__footer-bullet" aria-hidden="true">
                  ■
                </span>
                <span>SECURITY ENCLAVE: HARDWARE ISOLATED</span>
              </div>
              <div className="cloud-detail__footer-item">
                <span className="cloud-detail__footer-bullet" aria-hidden="true">
                  ■
                </span>
                <span>FAILOVER TOPOLOGY: MULTI-REGION ACTIVE</span>
              </div>
              <div className="cloud-detail__footer-item">
                <span className="cloud-detail__footer-bullet" aria-hidden="true">
                  ■
                </span>
                <span>IPC BUS: NOMINAL</span>
              </div>
            </footer>
          </section>
        )}
      </main>
    </div>
  )
}
