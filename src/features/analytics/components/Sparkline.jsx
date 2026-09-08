import React from 'react'
import { sparkline } from '../../../lib/chart'

/**
 * A single-series line chart drawn as one <path>.
 *
 * Accessibility is the reason this is a component rather than inline
 * SVG: a chart is an image to a sighted reader and a table to everyone
 * else, so it ships as both. The <svg> carries role="img" and a label
 * that states the shape in words ("rose from 90 to 100 over 6
 * readings"), and the same numbers follow in a screen-reader-only
 * table. Neither is a substitute for the other.
 *
 * Geometry lives in lib/chart.js so the path can be asserted on
 * directly instead of inspected in a rendered DOM.
 */
export default function Sparkline({
  values = [],
  label,
  caption,
  unit = '',
  tone = 'cyan',
  width = 320,
  height = 72,
}) {
  const geo = sparkline(values, { width, height })

  if (!geo) {
    return (
      <p className="ops-chart__empty">
        Nothing recorded yet — answer a threat in the Cyber District and this fills in.
      </p>
    )
  }

  const first = geo.points[0].value
  const last = geo.points[geo.points.length - 1].value
  const count = geo.points.length
  const range = `low ${geo.min}${unit}, high ${geo.max}${unit}`

  // Three cases, not two. A series that dipped and came back has the
  // same first and last value without ever being flat -- calling that
  // "fell from 10 to 10" is the kind of sentence that makes a screen
  // reader user distrust every other number on the page.
  let summary
  if (geo.flat) {
    summary = `${label}: held steady at ${first}${unit} across ${count} readings.`
  } else if (last === first) {
    summary = `${label}: ended where it started at ${first}${unit} across ${count} readings, ${range}.`
  } else {
    const verb = last > first ? 'rose' : 'fell'
    summary = `${label}: ${verb} from ${first}${unit} to ${last}${unit} across ${count} readings, ${range}.`
  }

  return (
    <div className={`ops-chart ops-chart--${tone}`}>
      <svg
        className="ops-chart__svg"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={summary}
      >
        {geo.area && <path className="ops-chart__area" d={geo.area} />}
        <path className="ops-chart__line" d={geo.path} />
        <circle
          className="ops-chart__head"
          cx={geo.points[geo.points.length - 1].x}
          cy={geo.points[geo.points.length - 1].y}
          r="3.5"
        />
      </svg>

      <div className="ops-chart__legend">
        <span className="ops-chart__legend-item">
          low <strong>{geo.min}{unit}</strong>
        </span>
        <span className="ops-chart__legend-item">
          now <strong>{last}{unit}</strong>
        </span>
        <span className="ops-chart__legend-item">
          high <strong>{geo.max}{unit}</strong>
        </span>
      </div>

      <table className="sr-only">
        <caption>{caption || summary}</caption>
        <thead>
          <tr>
            <th scope="col">Reading</th>
            <th scope="col">{label}</th>
          </tr>
        </thead>
        <tbody>
          {geo.points.map((point, index) => (
            <tr key={point.x + '-' + index}>
              <th scope="row">{index + 1}</th>
              <td>{point.value}{unit}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
