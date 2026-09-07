import { useEffect, useRef, useState } from 'react'
import { stagger } from 'animejs'
import { clampWorldHealth, INITIAL_WORLD_HEALTH } from '../../game/threatEngine'
import {
  motionTimeline,
  prefersReducedMotion,
  settleIfReduced,
  stopMotion,
} from '../../lib/motion'
import SeverityBadge from './components/SeverityBadge'
import ThreatPanel from './components/ThreatPanel'
import './CyberDistrict.css'

const SEVERITY_LEVELS = ['low', 'medium', 'high', 'critical']

/**
 * Cyber District shell.
 *
 * This is the UI layer only -- spec's layered architecture (UI ->
 * Components -> Game Logic -> Services -> Storage) means the panels
 * below are placeholders a later phase fills with real threat data,
 * except Incident Response, which now runs on the threat engine in
 * game/threatEngine.js (design: Kavindu).
 *
 * World health lives here rather than inside ThreatPanel because the
 * header needs to show it too -- it is district-level state, not
 * panel-level state.
 */
export default function CyberDistrict({ onExit }) {
  const rootRef = useRef(null)
  const timelineRef = useRef(null)
  const [ready, setReady] = useState(prefersReducedMotion)
  const [activeSeverity, setActiveSeverity] = useState('low')
  const [worldHealth, setWorldHealth] = useState(INITIAL_WORLD_HEALTH)

  function applyHealthDelta(delta) {
    setWorldHealth((current) => clampWorldHealth(current + delta))
  }

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

  return (
    <section ref={rootRef} className="cyber-district" aria-labelledby="cyber-district-title">
      <p className="cyber-district__eyebrow">CYBER DISTRICT</p>
      <div className="cyber-district__title-row">
        <h1 id="cyber-district-title" className="cyber-district__title">
          Security Command
        </h1>
        <div className="cyber-district__health" role="status" aria-label={`World health ${worldHealth}`}>
          <span className="cyber-district__health-label">World Health</span>
          <div className="cyber-district__health-bar">
            <div className="cyber-district__health-fill" style={{ width: `${worldHealth}%` }} />
          </div>
          <span className="cyber-district__health-value">{worldHealth}</span>
        </div>
      </div>

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
          <ThreatPanel worldHealth={worldHealth} onHealthChange={applyHealthDelta} />
        </article>

        <article className="cyber-district__panel" aria-labelledby="defense-status-heading">
          <h2 id="defense-status-heading" className="cyber-district__panel-heading">
            Defense Status
          </h2>
          <p className="cyber-district__panel-note">
            Firewall simulation and game integration arrive in a later
            phase.
          </p>
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
