import { useState, useEffect, useRef, useCallback } from 'react'
import { stagger } from 'animejs'
import { CLOUD_LOCATIONS } from './cloudLocations'
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
 * Cloud District: Step 1 Visual Environment & Location Discovery.
 *
 * Implements the 3 discoverable locations:
 * - Compute Island
 * - Storage Valley
 * - Database Lake
 */
export default function CloudDistrict({ onBackToIntro }) {
  const [selectedId, setSelectedId] = useState(null)
  const rootRef = useRef(null)
  const timelineRef = useRef(null)

  const selectedLocation = CLOUD_LOCATIONS.find((loc) => loc.id === selectedId) || null

  const handleSelect = (id) => {
    setSelectedId((prev) => (prev === id ? null : id))
  }

  const handleCloseDetail = useCallback(() => {
    setSelectedId(null)
  }, [])

  // Keyboard shortcut: Escape to close inspection panel
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && selectedId) {
        handleCloseDetail()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedId, handleCloseDetail])

  // Anime.js entry animation
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

  return (
    <div ref={rootRef} className="cloud-district">
      {/* Visual background layers */}
      <div className="cloud-district__grid-bg" aria-hidden="true" />
      <div className="cloud-district__ambient-glow" aria-hidden="true" />

      {/* Top HUD Telemetry Navigation */}
      <header className="cloud-district__hud">
        <div className="cloud-district__hud-left">
          <div className="cloud-district__hud-badge">
            <span className="cloud-district__beacon-dot" aria-hidden="true" />
            <span>DISTRICT // 01: CLOUD</span>
          </div>
          <span className="cloud-district__hud-status">
            TOPOLOGY: STABLE · REGION: GLOBAL MESH
          </span>
        </div>

        <div className="cloud-district__hud-actions">
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

      {/* Main World Canvas */}
      <section className="cloud-district__canvas">
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

              return (
                <button
                  key={loc.id}
                  type="button"
                  id={`location-node-${loc.id}`}
                  className={`cloud-node ${isSelected ? 'cloud-node--selected' : ''}`}
                  onClick={() => handleSelect(loc.id)}
                  aria-expanded={isSelected}
                  aria-controls={isSelected ? 'cloud-detail-panel' : undefined}
                  aria-label={`${loc.title} - ${loc.subtitle}. Click to inspect sector.`}
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
                      <span className="cloud-node__pulse" aria-hidden="true" />
                      <span>{isSelected ? '[ ACTIVE SECTOR ]' : '[ STANDBY ]'}</span>
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

        {/* Location Detail Inspection Panel (Local UI Response) */}
        {selectedLocation && (
          <section
            id="cloud-detail-panel"
            className="cloud-detail"
            aria-labelledby="cloud-detail-title"
          >
            <div className="cloud-detail__header">
              <div>
                <div className="cloud-detail__meta">
                  <span className="cloud-detail__code">{selectedLocation.code}</span>
                  <span className="cloud-detail__coords">
                    {selectedLocation.coordinates}
                  </span>
                  <span className="cloud-district__hud-badge">
                    {selectedLocation.status}
                  </span>
                </div>
                <h3 id="cloud-detail-title" className="cloud-detail__title">
                  {selectedLocation.title}
                </h3>
                <p className="cloud-detail__subtitle">{selectedLocation.subtitle}</p>
              </div>

              <button
                type="button"
                className="cloud-detail__close"
                onClick={handleCloseDetail}
                aria-label={`Close ${selectedLocation.title} inspection`}
              >
                <span>&times;</span>
                <span>CLOSE [ESC]</span>
              </button>
            </div>

            <div className="cloud-detail__grid">
              {/* Telemetry Metrics */}
              <div>
                <h4 className="cloud-detail__section-title">Telemetry & Status</h4>
                <div className="cloud-detail__telemetry-grid">
                  {selectedLocation.telemetry.map((stat) => (
                    <div key={stat.label} className="cloud-detail__stat-card">
                      <div className="cloud-detail__stat-label">{stat.label}</div>
                      <div className="cloud-detail__stat-value">{stat.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Architectural Capabilities */}
              <div>
                <h4 className="cloud-detail__section-title">
                  Architectural Capabilities
                </h4>
                <ul className="cloud-detail__features-list">
                  {selectedLocation.features.map((feat) => (
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
          </section>
        )}
      </section>
    </div>
  )
}
