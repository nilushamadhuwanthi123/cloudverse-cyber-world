import React, { useEffect, useRef, useState } from 'react'
import { stagger } from 'animejs'
import { analyzeSecurity } from '../../game/securityAnalytics'
import { clearEvents, loadEvents } from '../../services/progressService'
import { motionTimeline, settleIfReduced, stopMotion } from '../../lib/motion'
import OutcomeBar from './components/OutcomeBar'
import SeverityBars from './components/SeverityBars'
import Sparkline from './components/Sparkline'
import './SecurityOps.css'

/**
 * Security Operations Center.
 *
 * A read-only view over the security event log: every number here is
 * derived from events the other districts recorded, so this screen owns
 * no state of the game and cannot change the outcome of a run. That is
 * deliberate -- an analytics screen that can alter what it measures is
 * a second source of truth waiting to disagree with the first.
 *
 * The log is read once on mount and again whenever this screen is
 * re-entered, which is enough: nothing can append to it while it is the
 * visible screen, because appending happens in the districts.
 */
export default function SecurityOps({ onBackToMap }) {
  const rootRef = useRef(null)
  const timelineRef = useRef(null)
  // The entrance runs once, when the log first arrives. Clearing the log
  // later re-renders the screen but must not replay the animation.
  const introPlayedRef = useRef(false)
  const [events, setEvents] = useState(null)
  const [confirmingClear, setConfirmingClear] = useState(false)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let cancelled = false
    loadEvents().then((loaded) => {
      if (!cancelled) setEvents(loaded)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const root = rootRef.current
    if (!root || events === null || introPlayedRef.current) return undefined
    introPlayedRef.current = true

    const tl = motionTimeline({ defaults: { ease: 'out(3)' } })
    tl.add(root.querySelectorAll('.ops__eyebrow'), { opacity: [0, 1], y: [-8, 0], duration: 380 })
      .add(root.querySelectorAll('.ops__title'), { opacity: [0, 1], scale: [0.97, 1], duration: 520 }, '-=220')
      .add(root.querySelectorAll('.ops-tile'), { opacity: [0, 1], y: [14, 0], duration: 380, delay: stagger(70) }, '-=260')
      .add(root.querySelectorAll('.ops-panel'), { opacity: [0, 1], y: [16, 0], duration: 420, delay: stagger(90) }, '-=200')

    timelineRef.current = tl
    settleIfReduced(tl)

    return () => stopMotion(timelineRef.current)
  }, [events])

  async function handleClear() {
    if (!confirmingClear) {
      setConfirmingClear(true)
      return
    }
    await clearEvents()
    setEvents([])
    setConfirmingClear(false)
    setNotice('Event log cleared. Mission progress and world health were not touched.')
  }

  if (events === null) {
    return (
      <section className="ops" aria-labelledby="ops-title">
        <h1 id="ops-title" className="ops__title">Security Operations Center</h1>
        <p className="ops__loading" role="status">Reading the event log…</p>
      </section>
    )
  }

  const data = analyzeSecurity(events)
  const hasData = data.eventCount > 0

  return (
    <section ref={rootRef} className="ops" aria-labelledby="ops-title">
      <div className="ops__head">
        <div>
          <p className="ops__eyebrow">SECURITY OPERATIONS</p>
          <h1 id="ops-title" className="ops__title">Operations Center</h1>
          <p className="ops__subtitle">
            Every reading below is computed from the {data.eventCount} event
            {data.eventCount === 1 ? '' : 's'} recorded across the districts —
            nothing here is stored as its own total, so a number can always be
            traced back to what produced it.
          </p>
        </div>

        <div className="ops__actions">
          <button
            type="button"
            className={`ops__clear ${confirmingClear ? 'ops__clear--armed' : ''}`}
            onClick={handleClear}
            disabled={!hasData}
          >
            {confirmingClear ? 'Confirm — clear the log' : 'Clear event log'}
          </button>
          {confirmingClear && (
            <button
              type="button"
              className="ops__cancel"
              onClick={() => setConfirmingClear(false)}
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      <p className="ops__notice" role="status" aria-live="polite">{notice}</p>

      {!hasData ? (
        <div className="ops-panel ops-panel--empty">
          <h2 className="ops-panel__heading">No activity recorded yet</h2>
          <p className="ops-panel__note">
            Answer a threat in the Cyber District, work an investigation, or
            toggle a defense rule. Each of those writes one event, and this
            screen redraws itself from them.
          </p>
        </div>
      ) : null}

      <div className="ops__tiles">
        <Tile
          label="Response accuracy"
          value={`${data.responses.accuracy}%`}
          detail={`${data.responses.correct} correct of ${data.responses.total}`}
          tone={data.responses.accuracy >= 70 ? 'good' : data.responses.total ? 'warn' : 'idle'}
        />
        <Tile
          label="Threats handled"
          value={data.responses.total}
          detail={`${data.responses.wrong} escalated`}
          tone={data.responses.total ? 'info' : 'idle'}
        />
        <Tile
          label="Best streak"
          value={data.streaks.best}
          detail={`${data.streaks.current} running now`}
          tone={data.streaks.best >= 3 ? 'good' : 'idle'}
        />
        <Tile
          label="Investigations closed"
          value={data.incidents.total}
          detail={
            data.incidents.total
              ? `${data.incidents.resolutionRate}% resolved`
              : 'none closed yet'
          }
          tone={data.incidents.total ? 'info' : 'idle'}
        />
      </div>

      <div className="ops__grid">
        <article className="ops-panel" aria-labelledby="ops-health-heading">
          <h2 id="ops-health-heading" className="ops-panel__heading">World health over time</h2>
          <p className="ops-panel__note">One reading per threat response.</p>
          <Sparkline
            values={data.health.map((point) => point.value)}
            label="World health"
            tone="mint"
          />
        </article>

        <article className="ops-panel" aria-labelledby="ops-score-heading">
          <h2 id="ops-score-heading" className="ops-panel__heading">Security score over time</h2>
          <p className="ops-panel__note">Streak bonuses make good runs steepen.</p>
          <Sparkline
            values={data.score.map((point) => point.value)}
            label="Security score"
            tone="cyan"
          />
        </article>

        <article className="ops-panel" aria-labelledby="ops-severity-heading">
          <h2 id="ops-severity-heading" className="ops-panel__heading">Accuracy by severity</h2>
          <p className="ops-panel__note">
            Where the mistakes actually are, rather than one blended number.
          </p>
          <SeverityBars rows={data.bySeverity} />
        </article>

        <article className="ops-panel" aria-labelledby="ops-outcome-heading">
          <h2 id="ops-outcome-heading" className="ops-panel__heading">Outcomes</h2>
          <p className="ops-panel__note">How responses and investigations ended.</p>

          <h3 className="ops-panel__subheading">Threat responses</h3>
          <OutcomeBar
            parts={[
              { label: 'Contained', value: data.responses.correct, tone: 'good' },
              { label: 'Escalated', value: data.responses.wrong, tone: 'bad' },
            ]}
            emptyLabel="No threats answered yet."
          />

          <h3 className="ops-panel__subheading">Investigations</h3>
          <OutcomeBar
            parts={[
              { label: 'Resolved', value: data.incidents.resolved, tone: 'good' },
              { label: 'Escalated', value: data.incidents.escalated, tone: 'bad' },
            ]}
            emptyLabel="No investigations closed yet."
          />
        </article>

        <article className="ops-panel ops-panel--wide" aria-labelledby="ops-posture-heading">
          <h2 id="ops-posture-heading" className="ops-panel__heading">Defensive posture</h2>
          <dl className="ops-facts">
            <div className="ops-facts__item">
              <dt className="ops-facts__key">Defense rules toggled</dt>
              <dd className="ops-facts__value">{data.defenses.toggles}</dd>
            </div>
            <div className="ops-facts__item">
              <dt className="ops-facts__key">Most exposed this run</dt>
              <dd className="ops-facts__value">
                {data.defenses.lowestActiveCount === null
                  ? 'never lowered'
                  : `${data.defenses.lowestActiveCount} of 4 rules on`}
              </dd>
            </div>
            <div className="ops-facts__item">
              <dt className="ops-facts__key">Clean wins (all defenses on)</dt>
              <dd className="ops-facts__value">{data.fullDefenseWins}</dd>
            </div>
            <div className="ops-facts__item">
              <dt className="ops-facts__key">Mean time to close</dt>
              <dd className="ops-facts__value">
                {data.incidents.meanSeconds === null
                  ? 'not measured yet'
                  : `${data.incidents.meanSeconds}s`}
              </dd>
            </div>
          </dl>
        </article>
      </div>

      {typeof onBackToMap === 'function' && (
        <button type="button" className="ops__exit" onClick={onBackToMap}>
          Back to world map
        </button>
      )}
    </section>
  )
}

/** One headline number. Kept local -- nothing else needs this shape. */
function Tile({ label, value, detail, tone = 'idle' }) {
  return (
    <div className={`ops-tile ops-tile--${tone}`}>
      <span className="ops-tile__label">{label}</span>
      <strong className="ops-tile__value">{value}</strong>
      <span className="ops-tile__detail">{detail}</span>
    </div>
  )
}
