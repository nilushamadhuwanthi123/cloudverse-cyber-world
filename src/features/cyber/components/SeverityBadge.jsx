/**
 * A single severity level, always paired with its text label.
 *
 * Colour alone is not information a colour-blind visitor can read (spec
 * 32), so this never renders as a bare coloured dot -- the label is part
 * of the component, not an optional prop.
 */

const LEVELS = {
  low:      { label: 'LOW',      var: '--sev-low' },
  medium:   { label: 'MEDIUM',   var: '--sev-medium' },
  high:     { label: 'HIGH',     var: '--sev-high' },
  critical: { label: 'CRITICAL', var: '--sev-critical' },
}

export default function SeverityBadge({ level, active = false, onClick }) {
  const config = LEVELS[level]
  if (!config) return null

  const style = { '--badge-color': `var(${config.var})` }
  const className = `severity-badge${active ? ' severity-badge--active' : ''}`

  if (!onClick) {
    return (
      <span className={className} style={style}>
        <span className="severity-badge__dot" aria-hidden="true" />
        {config.label}
      </span>
    )
  }

  return (
    <button
      type="button"
      className={className}
      style={style}
      aria-pressed={active}
      onClick={onClick}
    >
      <span className="severity-badge__dot" aria-hidden="true" />
      {config.label}
    </button>
  )
}
