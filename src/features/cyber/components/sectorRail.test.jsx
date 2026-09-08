import React from 'react'
import { describe, expect, it } from 'vitest'
import { renderToString } from 'react-dom/server'
import { resolveSectors } from '../../../game/cyberNavigation'
import BootSequence, { BOOT_LINES } from './BootSequence'
import SectorRail from './SectorRail'

const fresh = resolveSectors({ completedMissionIds: [] })
const unlocked = resolveSectors({ completedMissionIds: ['first-response'] })

describe('SectorRail', () => {
  it('is a real tablist with one tab per sector', () => {
    const html = renderToString(
      <SectorRail sectors={fresh} activeId="operations" onSelect={() => {}} />
    )

    expect(html).toContain('role="tablist"')
    expect(html).toContain('aria-orientation="vertical"')
    expect(html.match(/role="tab"/g)).toHaveLength(fresh.length)
  })

  // Roving tabindex: Tab should leave the rail, not walk through nine
  // items before reaching the content the rail controls.
  it('keeps exactly one tab in the tab order', () => {
    const html = renderToString(
      <SectorRail sectors={fresh} activeId="analytics" onSelect={() => {}} />
    )

    expect(html.match(/tabindex="0"/g)).toHaveLength(1)
    expect(html.match(/tabindex="-1"/g)).toHaveLength(fresh.length - 1)
    expect(html).toContain('aria-selected="true"')
  })

  it('ties each tab to the panel it controls', () => {
    const html = renderToString(
      <SectorRail sectors={fresh} activeId="operations" onSelect={() => {}} />
    )

    expect(html).toContain('id="sector-tab-operations"')
    expect(html).toContain('aria-controls="sector-panel-operations"')
  })

  // Status is a word on every row, so the rail survives having its
  // colour removed.
  it('writes each sector state out in text, not only in colour', () => {
    const html = renderToString(
      <SectorRail sectors={fresh} activeId="operations" onSelect={() => {}} />
    )

    expect(html).toContain('ONLINE')
    expect(html).toContain('LOCKED')
    expect(html).toContain('OFFLINE')
  })

  // aria-disabled promises a control that does nothing. These do
  // something useful -- they explain themselves -- so neither that
  // attribute nor the disabled property belongs on them.
  it('leaves unavailable sectors genuinely operable', () => {
    const html = renderToString(
      <SectorRail sectors={fresh} activeId="operations" onSelect={() => {}} />
    )

    expect(html).not.toContain('aria-disabled')
    expect(html).not.toContain('disabled=""')
  })

  it('drops the locked marking once the gate is met', () => {
    const before = renderToString(<SectorRail sectors={fresh} activeId="operations" onSelect={() => {}} />)
    const after = renderToString(<SectorRail sectors={unlocked} activeId="operations" onSelect={() => {}} />)

    expect((before.match(/sector-rail__item--locked/g) || []).length).toBe(1)
    expect(after.match(/sector-rail__item--locked/g)).toBeNull()
  })
})

describe('BootSequence', () => {
  it('offers a way out before it has said anything', () => {
    const html = renderToString(<BootSequence onComplete={() => {}} />)

    expect(html).toContain('Skip startup')
    expect(html).toContain('aria-live="polite"')
  })

  it('announces its lines through one live region rather than four', () => {
    const html = renderToString(<BootSequence onComplete={() => {}} />)
    expect(html.match(/aria-live/g)).toHaveLength(1)
    expect(BOOT_LINES.length).toBeGreaterThan(0)
  })
})
