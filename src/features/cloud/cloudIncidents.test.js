import { describe, it, expect } from 'vitest'
import {
  CLOUD_INCIDENTS,
  INCIDENT_LIFECYCLE,
  findIncident,
  isCorrectIncidentAction,
} from './cloudIncidents'

describe('cloudIncidents', () => {
  it('defines all three required incidents', () => {
    expect(CLOUD_INCIDENTS).toHaveLength(3)
    const ids = CLOUD_INCIDENTS.map((inc) => inc.id)
    expect(ids).toContain('high-traffic')
    expect(ids).toContain('server-failure')
    expect(ids).toContain('storage-capacity')
  })

  it('correctly maps incidents to target locations and actions', () => {
    const highTraffic = findIncident('high-traffic')
    expect(highTraffic).toBeDefined()
    expect(highTraffic.targetLocationId).toBe('compute')
    expect(highTraffic.correctActionId).toBe('scale-up')
    expect(isCorrectIncidentAction(highTraffic, 'scale-up')).toBe(true)
    expect(isCorrectIncidentAction(highTraffic, 'wrong-action')).toBe(false)

    const serverFailure = findIncident('server-failure')
    expect(serverFailure).toBeDefined()
    expect(serverFailure.targetLocationId).toBe('compute')
    expect(serverFailure.correctActionId).toBe('restart-server')
    expect(isCorrectIncidentAction(serverFailure, 'restart-server')).toBe(true)

    const storageWarning = findIncident('storage-capacity')
    expect(storageWarning).toBeDefined()
    expect(storageWarning.targetLocationId).toBe('storage')
    expect(storageWarning.correctActionId).toBe('optimize-storage')
    expect(isCorrectIncidentAction(storageWarning, 'optimize-storage')).toBe(true)
  })

  it('specifies the standard +5 reward and -10 penalty', () => {
    CLOUD_INCIDENTS.forEach((inc) => {
      expect(inc.reward).toBe(5)
      expect(inc.penalty).toBe(-10)
      expect(inc.activeMetrics.length).toBeGreaterThan(0)
      expect(inc.resolvedMetrics.length).toBeGreaterThan(0)
    })
  })

  it('exposes all lifecycle phases', () => {
    expect(INCIDENT_LIFECYCLE.IDLE).toBe('idle')
    expect(INCIDENT_LIFECYCLE.DETECTED).toBe('detected')
    expect(INCIDENT_LIFECYCLE.ACTIVE).toBe('active')
    expect(INCIDENT_LIFECYCLE.RESOLVED).toBe('resolved')
    expect(INCIDENT_LIFECYCLE.ESCALATED).toBe('escalated')
  })
})
