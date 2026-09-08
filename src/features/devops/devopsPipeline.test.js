import { describe, it, expect } from 'vitest'
import {
  PIPELINE_STAGES,
  STAGE_STATUS,
  PIPELINE_STATUS,
  getInitialStageStates,
  findStage,
} from './pipelineStages'
import {
  PIPELINE_INCIDENTS,
  findPipelineIncident,
  findIncidentForStage,
} from './pipelineIncidents'

describe('DevOps Pipeline Stages Configuration', () => {
  it('defines exactly six stages in the correct order', () => {
    expect(PIPELINE_STAGES).toHaveLength(6)
    const expectedOrder = ['code', 'build', 'test', 'package', 'deploy', 'live']
    expect(PIPELINE_STAGES.map((s) => s.id)).toEqual(expectedOrder)
  })

  it('provides required metadata for every stage', () => {
    PIPELINE_STAGES.forEach((stage) => {
      expect(stage.id).toBeDefined()
      expect(stage.name).toBeDefined()
      expect(stage.shortDesc).toBeDefined()
      expect(stage.technicalExplanation).toBeDefined()
      expect(stage.purpose).toBeDefined()
      expect(stage.durationMs).toBeGreaterThan(0)
      expect(stage.metrics).toBeInstanceOf(Array)
      expect(stage.metrics.length).toBeGreaterThanOrEqual(3)
    })
  })

  it('initializes all six stages to IDLE', () => {
    const initialStates = getInitialStageStates()
    expect(Object.keys(initialStates)).toHaveLength(6)
    Object.values(initialStates).forEach((status) => {
      expect(status).toBe(STAGE_STATUS.IDLE)
    })
  })

  it('finds stage by ID', () => {
    const buildStage = findStage('build')
    expect(buildStage).toBeDefined()
    expect(buildStage.name).toBe('BUILD')
    expect(findStage('non-existent')).toBeNull()
  })

  it('exposes standard pipeline states', () => {
    expect(PIPELINE_STATUS.READY).toBe('ready')
    expect(PIPELINE_STATUS.RUNNING).toBe('running')
    expect(PIPELINE_STATUS.SUCCESS).toBe('success')
    expect(PIPELINE_STATUS.FAILED).toBe('failed')
  })
})

describe('DevOps Pipeline Incidents Configuration', () => {
  it('defines the three controlled simulation incidents', () => {
    expect(PIPELINE_INCIDENTS).toHaveLength(3)
    const stages = PIPELINE_INCIDENTS.map((inc) => inc.stageId)
    expect(stages).toContain('build')
    expect(stages).toContain('test')
    expect(stages).toContain('deploy')
  })

  it('provides error reason and recovery action for each incident', () => {
    PIPELINE_INCIDENTS.forEach((inc) => {
      expect(inc.id).toBeDefined()
      expect(inc.title).toBeDefined()
      expect(inc.code).toBeDefined()
      expect(inc.errorReason).toBeDefined()
      expect(inc.recoveryAction).toBeDefined()
      expect(inc.recoveryExplanation).toBeDefined()
    })
  })

  it('finds incident by stage ID', () => {
    const buildIncident = findIncidentForStage('build')
    expect(buildIncident).toBeDefined()
    expect(buildIncident.id).toBe('build-failure')

    const testIncident = findIncidentForStage('test')
    expect(testIncident).toBeDefined()
    expect(testIncident.id).toBe('test-failure')

    expect(findIncidentForStage('code')).toBeNull()
  })

  it('finds incident by incident ID', () => {
    const incident = findPipelineIncident('deploy-failure')
    expect(incident).toBeDefined()
    expect(incident.stageId).toBe('deploy')
    expect(findPipelineIncident('unknown')).toBeNull()
  })
})
