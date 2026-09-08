import React from 'react'
import { stackedSegments } from '../../../lib/chart'

/**
 * One track split between outcomes.
 *
 * Segments are computed in lib/chart.js so they always total exactly
 * 100 -- rounding each one independently leaves a sliver of background
 * showing at the end of the bar, which reads as a third category that
 * does not exist.
 */
export default function OutcomeBar({ parts = [], emptyLabel = 'Nothing recorded yet.' }) {
  const segments = stackedSegments(parts)

  if (segments.length === 0) {
    return <p className="ops-chart__empty">{emptyLabel}</p>
  }

  return (
    <div className="ops-outcome">
      <div
        className="ops-outcome__track"
        role="img"
        aria-label={segments.map((s) => `${s.label}: ${s.value} (${s.percent}%)`).join(', ')}
      >
        {segments.map((segment) => (
          <span
            key={segment.label}
            className={`ops-outcome__segment ops-outcome__segment--${segment.tone}`}
            style={{ width: `${segment.percent}%` }}
          />
        ))}
      </div>

      <ul className="ops-outcome__key">
        {segments.map((segment) => (
          <li key={segment.label} className="ops-outcome__key-item">
            <span
              className={`ops-outcome__swatch ops-outcome__swatch--${segment.tone}`}
              aria-hidden="true"
            />
            <span className="ops-outcome__key-label">{segment.label}</span>
            <strong className="ops-outcome__key-value">{segment.value}</strong>
            <span className="ops-outcome__key-percent">{segment.percent}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
