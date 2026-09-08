/**
 * System Health & World Status rules.
 *
 * Defines the core world health thresholds and status categories:
 *  90–100: SYSTEM STABLE
 *  60–89:  SYSTEM WARNING
 *  30–59:  SYSTEM CRITICAL
 *   0–29:  SYSTEM COLLAPSE
 *
 * Pure JavaScript rule module adhering to the game/ layer guidelines
 * (no DOM, no JSX, no localStorage).
 */

export const SYSTEM_STATUS = {
  STABLE: 'SYSTEM STABLE',
  WARNING: 'SYSTEM WARNING',
  CRITICAL: 'SYSTEM CRITICAL',
  COLLAPSE: 'SYSTEM COLLAPSE',
}

export const SYSTEM_STATUS_LEVELS = {
  STABLE: 'stable',
  WARNING: 'warning',
  CRITICAL: 'critical',
  COLLAPSE: 'collapse',
}

/**
 * Returns the human-readable system status label for a given world health.
 *
 * @param {number} worldHealth - Current world health (0 - 100)
 * @returns {string} One of SYSTEM_STATUS values
 */
export function getSystemStatus(worldHealth) {
  const health = Math.max(0, Math.min(100, Number(worldHealth) || 0))
  if (health >= 90) return SYSTEM_STATUS.STABLE
  if (health >= 60) return SYSTEM_STATUS.WARNING
  if (health >= 30) return SYSTEM_STATUS.CRITICAL
  return SYSTEM_STATUS.COLLAPSE
}

/**
 * Returns the CSS/semantic level identifier for styling hooks.
 *
 * @param {number} worldHealth - Current world health (0 - 100)
 * @returns {string} 'stable' | 'warning' | 'critical' | 'collapse'
 */
export function getSystemStatusLevel(worldHealth) {
  const health = Math.max(0, Math.min(100, Number(worldHealth) || 0))
  if (health >= 90) return SYSTEM_STATUS_LEVELS.STABLE
  if (health >= 60) return SYSTEM_STATUS_LEVELS.WARNING
  if (health >= 30) return SYSTEM_STATUS_LEVELS.CRITICAL
  return SYSTEM_STATUS_LEVELS.COLLAPSE
}

/**
 * Provides comprehensive telemetry descriptor for the current system status.
 *
 * @param {number} worldHealth - Current world health (0 - 100)
 * @returns {object} Status metadata including description, pulse rate, and badge class
 */
export function getSystemStatusMetadata(worldHealth) {
  const health = Math.max(0, Math.min(100, Number(worldHealth) || 0))
  const status = getSystemStatus(health)
  const level = getSystemStatusLevel(health)

  switch (level) {
    case SYSTEM_STATUS_LEVELS.STABLE:
      return {
        status,
        level,
        health,
        description: 'All sectors reporting nominal throughput. Core telemetry synchronized.',
        badgeClass: 'status-badge--stable',
        colorVar: 'var(--status-stable)',
        pulseClass: 'pulse-nominal',
      }
    case SYSTEM_STATUS_LEVELS.WARNING:
      return {
        status,
        level,
        health,
        description: 'Infrastructure latency detected. Minor operational anomalies flagged.',
        badgeClass: 'status-badge--warning',
        colorVar: 'var(--status-warning)',
        pulseClass: 'pulse-warning',
      }
    case SYSTEM_STATUS_LEVELS.CRITICAL:
      return {
        status,
        level,
        health,
        description: 'Significant telemetry degradation. Defense perimeters compromised.',
        badgeClass: 'status-badge--critical',
        colorVar: 'var(--status-critical)',
        pulseClass: 'pulse-critical',
      }
    case SYSTEM_STATUS_LEVELS.COLLAPSE:
    default:
      return {
        status,
        level,
        health,
        description: 'Catastrophic integrity failure. Emergency containment engaged.',
        badgeClass: 'status-badge--collapse',
        colorVar: 'var(--cv-red)',
        pulseClass: 'pulse-collapse',
      }
  }
}
