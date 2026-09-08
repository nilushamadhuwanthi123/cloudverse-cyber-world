import React from 'react'

/**
 * Accuracy per threat severity, as four horizontal bars.
 *
 * Each bar is a real <progressbar> rather than a coloured div, so the
 * reading is available to assistive technology without the sighted-only
 * trick of "the green one is longer". A severity that has never been
 * seen still gets a row, marked as such, because a missing row reads as
 * a rendering bug rather than as "you have not met one of these yet".
 */
export default function SeverityBars({ rows = [] }) {
  return (
    <ul className="ops-bars">
      {rows.map((row) => {
        const seen = row.total > 0

        return (
          <li key={row.severity} className={`ops-bars__row ops-bars__row--${row.severity}`}>
            <span className="ops-bars__label">{row.severity}</span>

            <span className="ops-bars__track">
              <span
                className="ops-bars__fill"
                style={{ width: `${row.accuracy}%` }}
                role="progressbar"
                aria-valuenow={row.accuracy}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={
                  seen
                    ? `${row.severity} severity: ${row.correct} of ${row.total} answered correctly, ${row.accuracy} percent`
                    : `${row.severity} severity: none seen yet`
                }
              />
            </span>

            <span className="ops-bars__value">
              {seen ? `${row.accuracy}%` : '—'}
              <span className="ops-bars__count">
                {seen ? ` (${row.correct}/${row.total})` : ' none yet'}
              </span>
            </span>
          </li>
        )
      })}
    </ul>
  )
}
