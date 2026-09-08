import React from 'react'
import { describe, it, expect } from 'vitest'
import { renderToString } from 'react-dom/server'
import WorldMap from './WorldMap'
import {
  WORLD_DISTRICTS,
  WORLD_CONDUITS,
  findDistrict,
} from './worldMapData'
import {
  SYSTEM_STATUS,
  SYSTEM_STATUS_LEVELS,
  getSystemStatus,
  getSystemStatusLevel,
  getSystemStatusMetadata,
} from '../../game/systemHealth'
import {
  DISTRICT_STATUS,
  DISTRICT_IDS,
  evaluateDistrictStatus,
  canEnterDistrict,
  getLockReason,
  summarizeProgression,
} from '../../game/districtProgression'
import { INITIAL_PROGRESS } from '../../game/missionState'

describe('World Map Data & Structure', () => {
  it('defines all four major infrastructure sectors', () => {
    expect(WORLD_DISTRICTS).toHaveLength(4)
    const ids = WORLD_DISTRICTS.map((d) => d.id)
    expect(ids).toContain('core')
    expect(ids).toContain('cloud')
    expect(ids).toContain('devops')
    expect(ids).toContain('cyber')
  })

  it('provides required architectural metadata for every district', () => {
    WORLD_DISTRICTS.forEach((district) => {
      expect(district.id).toBeDefined()
      expect(district.name).toBeDefined()
      expect(district.shortName).toBeDefined()
      expect(district.subtitle).toBeDefined()
      expect(district.description).toBeDefined()
      expect(district.position.percentX).toBeGreaterThanOrEqual(0)
      expect(district.position.percentY).toBeGreaterThanOrEqual(0)
      expect(district.subsystems).toBeInstanceOf(Array)
      expect(district.subsystems.length).toBeGreaterThanOrEqual(3)
      expect(district.theme.primaryColor).toBeDefined()
    })
  })

  it('defines SVG conduits connecting Core to each district', () => {
    expect(WORLD_CONDUITS.length).toBeGreaterThanOrEqual(3)
    const targets = WORLD_CONDUITS.filter((c) => c.from === 'core').map((c) => c.to)
    expect(targets).toContain('cloud')
    expect(targets).toContain('devops')
    expect(targets).toContain('cyber')
  })

  it('finds district by ID', () => {
    expect(findDistrict('core')?.name).toBe('SYSTEM CORE')
    expect(findDistrict('cloud')?.name).toBe('CLOUD DISTRICT')
    expect(findDistrict('devops')?.name).toBe('DEVOPS DISTRICT')
    expect(findDistrict('cyber')?.name).toBe('CYBER DISTRICT')
    expect(findDistrict('nonexistent')).toBeNull()
  })
})

describe('System Health & World Status Threshold Rules', () => {
  it('maps 90–100 to SYSTEM STABLE', () => {
    expect(getSystemStatus(100)).toBe(SYSTEM_STATUS.STABLE)
    expect(getSystemStatus(95)).toBe(SYSTEM_STATUS.STABLE)
    expect(getSystemStatus(90)).toBe(SYSTEM_STATUS.STABLE)
    expect(getSystemStatusLevel(90)).toBe(SYSTEM_STATUS_LEVELS.STABLE)
  })

  it('maps 60–89 to SYSTEM WARNING', () => {
    expect(getSystemStatus(89)).toBe(SYSTEM_STATUS.WARNING)
    expect(getSystemStatus(75)).toBe(SYSTEM_STATUS.WARNING)
    expect(getSystemStatus(60)).toBe(SYSTEM_STATUS.WARNING)
    expect(getSystemStatusLevel(60)).toBe(SYSTEM_STATUS_LEVELS.WARNING)
  })

  it('maps 30–59 to SYSTEM CRITICAL', () => {
    expect(getSystemStatus(59)).toBe(SYSTEM_STATUS.CRITICAL)
    expect(getSystemStatus(45)).toBe(SYSTEM_STATUS.CRITICAL)
    expect(getSystemStatus(30)).toBe(SYSTEM_STATUS.CRITICAL)
    expect(getSystemStatusLevel(30)).toBe(SYSTEM_STATUS_LEVELS.CRITICAL)
  })

  it('maps 0–29 to SYSTEM COLLAPSE', () => {
    expect(getSystemStatus(29)).toBe(SYSTEM_STATUS.COLLAPSE)
    expect(getSystemStatus(10)).toBe(SYSTEM_STATUS.COLLAPSE)
    expect(getSystemStatus(0)).toBe(SYSTEM_STATUS.COLLAPSE)
    expect(getSystemStatusLevel(0)).toBe(SYSTEM_STATUS_LEVELS.COLLAPSE)
  })

  it('clamps values outside 0-100 safely', () => {
    expect(getSystemStatus(150)).toBe(SYSTEM_STATUS.STABLE)
    expect(getSystemStatus(-20)).toBe(SYSTEM_STATUS.COLLAPSE)
    expect(getSystemStatus('invalid')).toBe(SYSTEM_STATUS.COLLAPSE)
  })

  it('provides rich metadata for telemetry rendering', () => {
    const meta = getSystemStatusMetadata(95)
    expect(meta.status).toBe(SYSTEM_STATUS.STABLE)
    expect(meta.description).toContain('nominal')
    expect(meta.badgeClass).toBe('status-badge--stable')
  })
})

describe('District Progression & Unlock Rules', () => {
  it('evaluates Core and Cloud as permanently active', () => {
    expect(evaluateDistrictStatus(DISTRICT_IDS.CORE, INITIAL_PROGRESS)).toBe(DISTRICT_STATUS.ACTIVE)
    expect(evaluateDistrictStatus(DISTRICT_IDS.CLOUD, INITIAL_PROGRESS)).toBe(DISTRICT_STATUS.ACTIVE)
  })

  it('evaluates DevOps as available for execution drills', () => {
    expect(evaluateDistrictStatus(DISTRICT_IDS.DEVOPS, INITIAL_PROGRESS)).toBe(DISTRICT_STATUS.AVAILABLE)
  })

  it('locks Cyber district by default on a fresh run', () => {
    const status = evaluateDistrictStatus(DISTRICT_IDS.CYBER, INITIAL_PROGRESS)
    expect(status).toBe(DISTRICT_STATUS.LOCKED)
    expect(canEnterDistrict(status)).toBe(false)
  })

  it('unlocks Cyber when clearance override is granted', () => {
    const status = evaluateDistrictStatus(DISTRICT_IDS.CYBER, INITIAL_PROGRESS, { cyber: true })
    expect(status).toBe(DISTRICT_STATUS.AVAILABLE)
    expect(canEnterDistrict(status)).toBe(true)
  })

  it('activates Cyber when player has completed missions or earned score', () => {
    const progressWithScore = { ...INITIAL_PROGRESS, securityScore: 20 }
    expect(evaluateDistrictStatus(DISTRICT_IDS.CYBER, progressWithScore)).toBe(DISTRICT_STATUS.ACTIVE)

    const progressWithMission = { ...INITIAL_PROGRESS, completedMissionIds: ['first-response'] }
    expect(evaluateDistrictStatus(DISTRICT_IDS.CYBER, progressWithMission)).toBe(DISTRICT_STATUS.ACTIVE)
  })

  it('marks Cyber completed when all 4 missions are achieved', () => {
    const fullProgress = {
      ...INITIAL_PROGRESS,
      completedMissionIds: ['first-response', 'steady-hands', 'hold-the-line', 'full-perimeter'],
    }
    expect(evaluateDistrictStatus(DISTRICT_IDS.CYBER, fullProgress)).toBe(DISTRICT_STATUS.COMPLETED)
  })

  it('prevents entering locked districts and permits available/active/completed', () => {
    expect(canEnterDistrict(DISTRICT_STATUS.LOCKED)).toBe(false)
    expect(canEnterDistrict(DISTRICT_STATUS.AVAILABLE)).toBe(true)
    expect(canEnterDistrict(DISTRICT_STATUS.ACTIVE)).toBe(true)
    expect(canEnterDistrict(DISTRICT_STATUS.COMPLETED)).toBe(true)
  })

  it('provides informative reason when a district is locked', () => {
    const reason = getLockReason(DISTRICT_IDS.CYBER)
    expect(reason).toContain('Security Clearance')
    expect(reason.length).toBeGreaterThan(15)
  })

  it('summarizes district progression metrics accurately', () => {
    const statuses = {
      core: DISTRICT_STATUS.ACTIVE,
      cloud: DISTRICT_STATUS.ACTIVE,
      devops: DISTRICT_STATUS.AVAILABLE,
      cyber: DISTRICT_STATUS.LOCKED,
    }
    const summary = summarizeProgression(statuses)
    expect(summary.totalCount).toBe(4)
    expect(summary.activeCount).toBe(2)
    expect(summary.availableCount).toBe(1)
    expect(summary.lockedCount).toBe(1)
  })
})

describe('WorldMap Component Rendering & Accessibility', () => {
  it('renders the World Map container with proper region semantics', () => {
    const html = renderToString(<WorldMap onSelectDistrict={() => {}} onExitToIntro={() => {}} />)
    expect(html).toContain('world-map')
    expect(html).toContain('role="region"')
    expect(html).toContain('aria-label="CLOUDVERSE World Map Sector Hub"')
  })

  it('renders the Core, Cloud, DevOps, and Cyber nodes', () => {
    const html = renderToString(<WorldMap onSelectDistrict={() => {}} onExitToIntro={() => {}} />)
    expect(html).toContain('id="district-node-core"')
    expect(html).toContain('id="district-node-cloud"')
    expect(html).toContain('id="district-node-devops"')
    expect(html).toContain('id="district-node-cyber"')
  })

  it('renders SVG energy conduits connecting districts', () => {
    const html = renderToString(<WorldMap onSelectDistrict={() => {}} onExitToIntro={() => {}} />)
    expect(html).toContain('world-map__svg-canvas')
    expect(html).toContain('world-conduit__path')
  })

  it('renders the World Map HUD with World Health and System Status', () => {
    const html = renderToString(<WorldMap onSelectDistrict={() => {}} onExitToIntro={() => {}} />)
    expect(html).toContain('SYSTEM STATUS')
    expect(html).toContain('SYSTEM STABLE')
    expect(html).toContain('WORLD HEALTH')
    expect(html).toContain('100%')
    expect(html).toContain('DISTRICTS')
    expect(html).toContain('MISSIONS')
  })

  it('renders the District Inspector with title and architectural subsystems', () => {
    const html = renderToString(
      <WorldMap initialDistrictId="cloud" onSelectDistrict={() => {}} onExitToIntro={() => {}} />
    )
    expect(html).toContain('CLOUD DISTRICT')
    expect(html).toContain('SUBSYSTEM ARCHITECTURE')
    expect(html).toContain('ENTER CLOUD DISTRICT')
  })

  it('exposes accessible keyboard and screen reader attributes on interactive nodes', () => {
    const html = renderToString(<WorldMap onSelectDistrict={() => {}} onExitToIntro={() => {}} />)
    expect(html).toContain('role="tablist"')
    expect(html).toContain('role="tab"')
    expect(html).toContain('aria-selected="true"')
    expect(html).toContain('aria-controls="district-inspector-panel"')
  })

  it('displays lock badge and locked action for locked cyber district', () => {
    const html = renderToString(
      <WorldMap initialDistrictId="cyber" onSelectDistrict={() => {}} onExitToIntro={() => {}} />
    )
    expect(html).toContain('world-node__lock-badge')
    expect(html).toContain('SECTOR ACCESS RESTRICTED')
    expect(html).toContain('ACCESS LOCKED')
    expect(html).toContain('Authorize Security Clearance')
  })

  it('renders exit button to return to introduction screen', () => {
    const html = renderToString(<WorldMap onSelectDistrict={() => {}} onExitToIntro={() => {}} />)
    expect(html).toContain('Exit to Intro')
  })
})
