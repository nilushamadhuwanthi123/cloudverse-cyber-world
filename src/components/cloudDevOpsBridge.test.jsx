import React from 'react'
import { describe, it, expect } from 'vitest'
import { renderToString } from 'react-dom/server'
import CloudDevOpsBridge from './CloudDevOpsBridge'
import CloudDistrict from '../features/cloud/CloudDistrict'
import DevOpsPipeline from '../features/devops/DevOpsPipeline'

describe('CloudDevOpsBridge Component', () => {
  it('renders semantic region landmark with accessible label', () => {
    const html = renderToString(
      <CloudDevOpsBridge currentDistrict="cloud" onNavigate={() => {}} />
    )
    expect(html).toContain('role="region"')
    expect(html).toContain('aria-label="Cloud Infrastructure to DevOps Deployment Bridge"')
  })

  it('displays the active deployment channel indicator and telemetry tag', () => {
    const html = renderToString(
      <CloudDevOpsBridge currentDistrict="cloud" onNavigate={() => {}} />
    )
    expect(html).toContain('DEPLOYMENT CHANNEL // ACTIVE')
    expect(html).toContain('0.8ms HIGHWAY MESH')
  })

  it('renders all three architectural tiers in order', () => {
    const html = renderToString(
      <CloudDevOpsBridge currentDistrict="cloud" onNavigate={() => {}} />
    )
    expect(html).toContain('TIER 01: FOUNDATION')
    expect(html).toContain('Cloud Infrastructure')
    expect(html).toContain('Compute • Storage • Database')

    expect(html).toContain('TIER 02: DELIVERY')
    expect(html).toContain('DevOps Pipeline')

    expect(html).toContain('TIER 03: LIVE')
    expect(html).toContain('Production Mesh')
  })

  it('activates Tier 01 when mounted in Cloud District', () => {
    const html = renderToString(
      <CloudDevOpsBridge currentDistrict="cloud" onNavigate={() => {}} />
    )
    expect(html).toContain('cloud-devops-bridge--cloud')
    expect(html).toContain('cloud-devops-bridge__node--active')
    expect(html).toContain('PROCEED TO DEVOPS PIPELINE')
  })

  it('activates Tier 02 and displays pipeline status when mounted in DevOps District', () => {
    const html = renderToString(
      <CloudDevOpsBridge
        currentDistrict="devops"
        pipelineStatus="running"
        onNavigate={() => {}}
      />
    )
    expect(html).toContain('cloud-devops-bridge--devops')
    expect(html).toContain('Status: RUNNING')
    expect(html).toContain('INSPECT CLOUD INFRASTRUCTURE')
  })

  it('reflects World Health status in Tier 03 Live Production Mesh', () => {
    const nominalHtml = renderToString(
      <CloudDevOpsBridge currentDistrict="cloud" worldHealth={100} />
    )
    expect(nominalHtml).toContain('Nominal Throughput')

    const stressedHtml = renderToString(
      <CloudDevOpsBridge currentDistrict="cloud" worldHealth={65} />
    )
    expect(stressedHtml).toContain('Under Stress')
  })

  it('renders animated SVG conduits with aria-hidden="true"', () => {
    const html = renderToString(
      <CloudDevOpsBridge currentDistrict="cloud" onNavigate={() => {}} />
    )
    expect(html).toContain('class="cloud-devops-bridge__connector" aria-hidden="true"')
    expect(html).toContain('class="cloud-devops-bridge__svg-flow"')
  })

  it('omits navigation button when onNavigate is omitted', () => {
    const html = renderToString(
      <CloudDevOpsBridge currentDistrict="cloud" />
    )
    expect(html).not.toContain('cloud-devops-bridge__btn')
  })
})

describe('Cloud District ↔ DevOps District UI Integration', () => {
  it('renders the bridge inside Cloud District', () => {
    const html = renderToString(
      <CloudDistrict
        onBackToMap={() => {}}
        onNavigateToDevOps={() => {}}
      />
    )
    expect(html).toContain('role="region"')
    expect(html).toContain('aria-label="Cloud Infrastructure to DevOps Deployment Bridge"')
    expect(html).toContain('cloud-district__bridge-link-btn')
    expect(html).toContain('⚡ DEVOPS PIPELINE')
    expect(html).toContain('cloud-district__back-map-btn')
    expect(html).toContain('WORLD MAP')
  })

  it('renders the bridge inside DevOps District', () => {
    const html = renderToString(
      <DevOpsPipeline
        onBackToMap={() => {}}
        onNavigateToCloud={() => {}}
      />
    )
    expect(html).toContain('role="region"')
    expect(html).toContain('aria-label="Cloud Infrastructure to DevOps Deployment Bridge"')
    expect(html).toContain('devops-district__bridge-link-btn')
    expect(html).toContain('☁️ CLOUD FABRIC')
    expect(html).toContain('devops-district__back-map-btn')
    expect(html).toContain('WORLD MAP')
  })
})
