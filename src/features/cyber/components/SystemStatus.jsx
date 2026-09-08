import React from 'react'
import { getProtectionCoverage } from '../../../game/defenseRules'
import { getSystemStatusMetadata } from '../../../game/systemHealth'
import './SystemStatus.css'

/**
 * System status readout.
 *
 * Four live figures, each one derived from state that already exists:
 * world health drives the band, the defense rules drive coverage, the
 * risk model drives exposure, and the incident count comes from the
 * sector that owns it. Nothing here is a number invented to fill a tile.
 *
 * The band thresholds and copy come from game/systemHealth.js, which the
 * World Map already uses -- the same reading should not be defined twice
 * and then drift.
 */
export default function SystemStatus({ worldHealth, ruleStates, risk, openIncidents = 0 }) {
  const system = getSystemStatusMetadata(worldHealth)
  const coverage = getProtectionCoverage(ruleStates)

  return (
    <div className={`system-status system-status--${system.level}`}>
      <div className="system-status__band">
        <span className="system-status__band-label">{system.status}</span>
        <span className="system-status__band-health">{`${system.health}/100`}</span>
      </div>
      <p className="system-status__description">{system.description}</p>

      <dl className="system-status__readouts">
        <div className="system-status__readout">
          <dt className="system-status__key">Defense coverage</dt>
          <dd className="system-status__value">
            {`${coverage}%`}
            <span className="system-status__note">
              {coverage === 100 ? 'all rules on' : 'perimeter incomplete'}
            </span>
          </dd>
        </div>

        <div className="system-status__readout">
          <dt className="system-status__key">Current exposure</dt>
          <dd className="system-status__value">
            {risk.value}
            <span className="system-status__note">{risk.level} risk</span>
          </dd>
        </div>

        <div className="system-status__readout">
          <dt className="system-status__key">Open investigations</dt>
          <dd className="system-status__value">
            {openIncidents}
            <span className="system-status__note">
              {openIncidents === 0 ? 'none active' : 'in Incident Response'}
            </span>
          </dd>
        </div>
      </dl>
    </div>
  )
}
