import React, { useEffect, useState } from 'react'
import {
  DEFENSE_RULES,
  OVERALL_DEFENSE_STATUS,
  getInitialRuleStates,
  getActiveRulesCount,
  getProtectionCoverage,
  getDefenseStatus,
  shouldDecayHealth,
  createDecayInterval,
} from '../../../game/defenseRules'
import './DefenseStatus.css'

/**
 * Defense Status Panel: four fixed, toggleable firewall rules.
 *
 * Implements the fictional defensive security layer for the Cyber District:
 *  1. Block Unauthorized IPs
 *  2. Rate Limiting
 *  3. Payload Quarantine
 *  4. Service Watchdog
 *
 * Behavior:
 *  - Exactly four fixed rules (no adding, removing, or editing).
 *  - Starts with ALL FOUR rules ON.
 *  - Turning ANY rule OFF triggers World Health decay (-1 every 3 seconds).
 *  - The penalty is strictly -1 every 3s regardless of how many rules are OFF.
 *  - Turning all rules back ON immediately stops the decay (no auto-recovery).
 *  - Fully accessible switch controls with semantic role="switch", aria-checked,
 *    and keyboard support (Tab, Enter, Space).
 */
export default function DefenseStatus({ ruleStates, onToggleRule, onHealthChange }) {
  // Support controlled mode (from parent CyberDistrict) or fallback internal state
  const isControlled = ruleStates !== undefined && typeof onToggleRule === 'function'
  const [internalRuleStates, setInternalRuleStates] = useState(getInitialRuleStates)

  const activeRuleStates = isControlled ? ruleStates : internalRuleStates

  const handleToggle = (ruleId) => {
    if (isControlled) {
      onToggleRule(ruleId)
    } else {
      setInternalRuleStates((current) => ({
        ...current,
        [ruleId]: !current[ruleId],
      }))
    }
  }

  // Health Decay Interval: exactly -1 every 3 seconds while ANY rule is
  // not ON. The timing rule itself lives in game/defenseRules.js -- this
  // effect only starts it and returns its own stop function as cleanup,
  // so the panel and the rules module can never drift apart on when or
  // how fast health leaks.
  useEffect(
    () => createDecayInterval(activeRuleStates, onHealthChange),
    [activeRuleStates, onHealthChange]
  )

  const activeCount = getActiveRulesCount(activeRuleStates)
  const coveragePercent = getProtectionCoverage(activeRuleStates)
  const overallStatus = getDefenseStatus(activeRuleStates)
  const isDecayActive = shouldDecayHealth(activeRuleStates)

  const statusClass =
    overallStatus === OVERALL_DEFENSE_STATUS.FULLY_ACTIVE
      ? 'fully-active'
      : overallStatus === OVERALL_DEFENSE_STATUS.CRITICAL
      ? 'critical'
      : 'degraded'

  return (
    <div className="defense-status" role="region" aria-label="Defense Status System Panel">
      {/* Top Telemetry & Overall Status Header */}
      <div className="defense-status__header">
        <div className="defense-status__header-meta">
          <span className="defense-status__header-tag">SYSTEM DEFENSE</span>
          <div className={`defense-status__overall-badge defense-status__overall-badge--${statusClass}`}>
            <span className="defense-status__status-pulse" aria-hidden="true" />
            <span className="defense-status__overall-text">{overallStatus}</span>
          </div>
        </div>

        <div className="defense-status__coverage">
          <div className="defense-status__coverage-stats">
            <span className="defense-status__coverage-count">
              {`${activeCount} / ${DEFENSE_RULES.length} RULES ACTIVE`}
            </span>
            <span className="defense-status__coverage-percent">{`${coveragePercent}% COVERAGE`}</span>
          </div>
          <div className="defense-status__coverage-track">
            <div
              className={`defense-status__coverage-fill defense-status__coverage-fill--${statusClass}`}
              style={{ width: `${coveragePercent}%` }}
              role="progressbar"
              aria-valuenow={coveragePercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Defense protection coverage ${coveragePercent}%`}
            />
          </div>
        </div>
      </div>

      {/* The Four Fixed Defensive Rules */}
      <div className="defense-status__rules-list" role="group" aria-label="Firewall Defense Rules">
        {DEFENSE_RULES.map((rule) => {
          const isOn = Boolean(activeRuleStates[rule.id])

          return (
            <div
              key={rule.id}
              className={`defense-status__rule ${
                isOn ? 'defense-status__rule--active' : 'defense-status__rule--disabled'
              }`}
            >
              <div className="defense-status__rule-info">
                <div className="defense-status__rule-title-row">
                  <span className="defense-status__rule-title">{rule.title || rule.label}</span>
                  {rule.category && (
                    <span className="defense-status__rule-category">{rule.category}</span>
                  )}
                  <span
                    className={`defense-status__state-pill defense-status__state-pill--${
                      isOn ? 'on' : 'off'
                    }`}
                  >
                    {isOn ? 'ACTIVE' : 'DISABLED'}
                  </span>
                </div>
                <p className="defense-status__rule-description">{rule.description}</p>
              </div>

              {/* Accessible Semantic Switch Control */}
              <button
                type="button"
                role="switch"
                id={`switch-${rule.id}`}
                aria-checked={isOn}
                aria-label={`${rule.title || rule.label} — ${isOn ? 'ON' : 'OFF'}`}
                data-cursor={isOn ? 'danger' : 'action'}
                className={`defense-status__toggle defense-status__toggle--${isOn ? 'on' : 'off'}`}
                onClick={() => handleToggle(rule.id)}
              >
                <span className="defense-status__toggle-track" aria-hidden="true">
                  <span className="defense-status__toggle-thumb" />
                </span>
                <span className="defense-status__toggle-text">{isOn ? 'ON' : 'OFF'}</span>
              </button>
            </div>
          )
        })}
      </div>

      {/* Health Decay Status Broadcast */}
      <div
        className={`defense-status__decay-bar defense-status__decay-bar--${
          isDecayActive ? 'active' : 'inactive'
        }`}
        role="status"
        aria-live="polite"
      >
        <div className="defense-status__decay-info">
          <span className="defense-status__decay-dot" aria-hidden="true" />
          <span className="defense-status__decay-label">HEALTH DECAY:</span>
          <span className="defense-status__decay-value">
            {isDecayActive ? '-1 / 3s' : 'INACTIVE'}
          </span>
        </div>
        <span className="defense-status__decay-subtext">
          {isDecayActive ? 'DEFENSE INTEGRITY LEAKING' : 'WORLD HEALTH PROTECTED'}
        </span>
      </div>
    </div>
  )
}
