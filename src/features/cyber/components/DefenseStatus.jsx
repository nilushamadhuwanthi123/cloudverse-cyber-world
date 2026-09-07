import { useEffect } from 'react'
import { DEFENSE_RULES } from '../../../game/defenseRules'
import './DefenseStatus.css'

// How often an off rule costs world health, and by how much. Slow
// enough that turning a rule off for a moment to read its description
// doesn't punish the player, but leaving one off has a real cost.
const DECAY_INTERVAL_MS = 3000
const DECAY_AMOUNT = 1

/**
 * Defense Status panel: four fixed, toggleable firewall rules.
 *
 * All four start on. Switching any of them off starts a slow world
 * health drain for as long as it stays off -- turning a defense off is
 * not free, even though nothing is actively attacking at that exact
 * moment. Switching it back on stops the drain immediately.
 *
 * Rule state is owned by CyberDistrict rather than here: the mission
 * layer needs to know whether every defense was on at the moment a
 * threat was resolved, which makes it district state, not panel state.
 */
export default function DefenseStatus({ ruleStates, onToggleRule, onHealthChange }) {
  useEffect(() => {
    const hasOffRule = Object.values(ruleStates).some((isOn) => !isOn)
    if (!hasOffRule) return undefined

    const interval = setInterval(() => {
      onHealthChange(-DECAY_AMOUNT)
    }, DECAY_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [ruleStates, onHealthChange])

  return (
    <div className="defense-status">
      {DEFENSE_RULES.map((rule) => {
        const isOn = ruleStates[rule.id]
        return (
          <div key={rule.id} className="defense-status__rule">
            <div className="defense-status__rule-info">
              <span className="defense-status__rule-label">{rule.label}</span>
              <span className="defense-status__rule-description">{rule.description}</span>
            </div>
            <button
              type="button"
              className={`defense-status__toggle defense-status__toggle--${isOn ? 'on' : 'off'}`}
              onClick={() => onToggleRule(rule.id)}
              aria-pressed={isOn}
            >
              {isOn ? 'ON' : 'OFF'}
            </button>
          </div>
        )
      })}
    </div>
  )
}
