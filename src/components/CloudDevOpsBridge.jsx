import React from 'react'
import './CloudDevOpsBridge.css'

/**
 * CloudDevOpsBridge Component.
 *
 * Provides a cohesive visual and functional bridge between:
 * CLOUD INFRASTRUCTURE (Compute, Storage, Database)
 *        ↓
 * DEPLOYMENT HIGHWAY (DevOps CI/CD Pipeline)
 *        ↓
 * LIVE PRODUCTION SYSTEM
 *
 * Unifies the two districts so the player understands infrastructure
 * powers the deployment highway, which delivers the live system.
 */
export default function CloudDevOpsBridge({
  currentDistrict = 'cloud',
  onNavigate,
  pipelineStatus = 'ready',
  worldHealth = 100,
}) {
  const isCloud = currentDistrict === 'cloud'
  const isDevops = currentDistrict === 'devops'

  return (
    <aside
      className={`cloud-devops-bridge cloud-devops-bridge--${currentDistrict}`}
      role="region"
      aria-label="Cloud Infrastructure to DevOps Deployment Bridge"
    >
      <div className="cloud-devops-bridge__inner">
        {/* Bridge Header / Channel Indicator */}
        <div className="cloud-devops-bridge__header">
          <div className="cloud-devops-bridge__status-badge">
            <span className="cloud-devops-bridge__pulse-dot" aria-hidden="true" />
            <span className="cloud-devops-bridge__status-label">
              DEPLOYMENT CHANNEL // ACTIVE
            </span>
          </div>

          <div className="cloud-devops-bridge__telemetry-item">
            <span className="cloud-devops-bridge__telemetry-key">CHANNEL FABRIC:</span>
            <span className="cloud-devops-bridge__telemetry-val">0.8ms HIGHWAY MESH</span>
          </div>
        </div>

        {/* The Three-Tier Architectural Flow Diagram */}
        <div className="cloud-devops-bridge__flow" role="list" aria-label="Infrastructure Delivery Flow">
          {/* Tier 1: Cloud Infrastructure */}
          <div
            className={`cloud-devops-bridge__node ${
              isCloud ? 'cloud-devops-bridge__node--active' : 'cloud-devops-bridge__node--linked'
            }`}
            role="listitem"
          >
            <div className="cloud-devops-bridge__node-icon" aria-hidden="true">
              ☁️
            </div>
            <div className="cloud-devops-bridge__node-info">
              <span className="cloud-devops-bridge__node-tag">TIER 01: FOUNDATION</span>
              <span className="cloud-devops-bridge__node-name">Cloud Infrastructure</span>
              <span className="cloud-devops-bridge__node-sub">Compute • Storage • Database</span>
            </div>
          </div>

          {/* Animated Connecting Conduit */}
          <div className="cloud-devops-bridge__connector" aria-hidden="true">
            <svg
              className="cloud-devops-bridge__svg-flow"
              viewBox="0 0 60 20"
              fill="none"
              preserveAspectRatio="none"
            >
              <line
                x1="0"
                y1="10"
                x2="60"
                y2="10"
                stroke="var(--district-cloud-primary)"
                strokeWidth="2"
                strokeDasharray="4 4"
                className="cloud-devops-bridge__flow-line"
              />
              <polygon points="54 6, 60 10, 54 14" fill="var(--district-cloud-primary)" />
            </svg>
          </div>

          {/* Tier 2: DevOps Pipeline */}
          <div
            className={`cloud-devops-bridge__node ${
              isDevops ? 'cloud-devops-bridge__node--active' : 'cloud-devops-bridge__node--linked'
            }`}
            role="listitem"
          >
            <div className="cloud-devops-bridge__node-icon" aria-hidden="true">
              ⚡
            </div>
            <div className="cloud-devops-bridge__node-info">
              <span className="cloud-devops-bridge__node-tag">TIER 02: DELIVERY</span>
              <span className="cloud-devops-bridge__node-name">DevOps Pipeline</span>
              <span className="cloud-devops-bridge__node-sub">
                {isDevops
                  ? `Status: ${pipelineStatus.toUpperCase()}`
                  : 'CI/CD Automated Highway'}
              </span>
            </div>
          </div>

          {/* Animated Connecting Conduit */}
          <div className="cloud-devops-bridge__connector" aria-hidden="true">
            <svg
              className="cloud-devops-bridge__svg-flow"
              viewBox="0 0 60 20"
              fill="none"
              preserveAspectRatio="none"
            >
              <line
                x1="0"
                y1="10"
                x2="60"
                y2="10"
                stroke="var(--district-devops-primary)"
                strokeWidth="2"
                strokeDasharray="4 4"
                className="cloud-devops-bridge__flow-line"
              />
              <polygon points="54 6, 60 10, 54 14" fill="var(--district-devops-primary)" />
            </svg>
          </div>

          {/* Tier 3: Live Production System */}
          <div className="cloud-devops-bridge__node cloud-devops-bridge__node--live" role="listitem">
            <div className="cloud-devops-bridge__node-icon" aria-hidden="true">
              🌐
            </div>
            <div className="cloud-devops-bridge__node-info">
              <span className="cloud-devops-bridge__node-tag">TIER 03: LIVE</span>
              <span className="cloud-devops-bridge__node-name">Production Mesh</span>
              <span className="cloud-devops-bridge__node-sub">
                {worldHealth >= 80 ? 'Nominal Throughput' : 'Under Stress'}
              </span>
            </div>
          </div>
        </div>

        {/* Action Button to Transition Contextually Between Cloud and DevOps */}
        {typeof onNavigate === 'function' && (
          <div className="cloud-devops-bridge__action">
            {isCloud ? (
              <button
                type="button"
                className="cloud-devops-bridge__btn cloud-devops-bridge__btn--devops"
                onClick={onNavigate}
                aria-label="Proceed to DevOps Pipeline district"
              >
                <span>PROCEED TO DEVOPS PIPELINE</span>
                <span className="cloud-devops-bridge__btn-arrow" aria-hidden="true">
                  &rarr;
                </span>
              </button>
            ) : (
              <button
                type="button"
                className="cloud-devops-bridge__btn cloud-devops-bridge__btn--cloud"
                onClick={onNavigate}
                aria-label="Return to Cloud Infrastructure district"
              >
                <span className="cloud-devops-bridge__btn-arrow" aria-hidden="true">
                  &larr;
                </span>
                <span>INSPECT CLOUD INFRASTRUCTURE</span>
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  )
}
