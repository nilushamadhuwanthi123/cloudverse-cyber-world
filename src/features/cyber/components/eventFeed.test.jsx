import React from 'react'
import { describe, expect, it } from 'vitest'
import { renderToString } from 'react-dom/server'
import { defenseToggleEvent, threatResponseEvent } from '../../../game/securityEvents'
import EventFeed from './EventFeed'
import SystemStatus from './SystemStatus'
import { getInitialRuleStates } from '../../../game/defenseRules'

const at = (ms) => ({ now: () => ms, id: `e-${ms}` })

describe('EventFeed', () => {
  it('says nothing has happened rather than inventing traffic', () => {
    const html = renderToString(<EventFeed events={[]} />)

    expect(html).toContain('NO ACTIVITY RECORDED')
    expect(html).not.toContain('<ol')
  })

  // A live region around the whole list re-reads every entry each time
  // one arrives, which is how a helpful feed becomes an unusable one.
  it('announces only the newest line', () => {
    const events = [
      threatResponseEvent({ severity: 'low', correct: true, healthAfter: 100 }, at(1000)),
      defenseToggleEvent({ ruleId: 'rate-limiting', on: false, activeCount: 3 }, at(2000)),
    ]
    const html = renderToString(<EventFeed events={events} />)

    expect(html.match(/aria-live/g)).toHaveLength(1)
    expect(html).toContain('Defense rule disabled')
    // the announcement carries the newest, not the whole list
    const announcement = html.slice(html.indexOf('aria-live'), html.indexOf('</p>'))
    expect(announcement).not.toContain('Threat contained')
  })

  // axe is right that a scrollable region nobody can focus is a defect:
  // a mouse wheel is not an input method everyone has.
  it('makes the scrolling list reachable and announced by keyboard', () => {
    const events = [threatResponseEvent({ severity: 'low', correct: true, healthAfter: 100 }, at(1000))]
    const html = renderToString(<EventFeed events={events} />)

    expect(html).toContain('tabindex="0"')
    expect(html).toContain('aria-label="Security event feed, 1 recent event"')
  })

  it('states each outcome in words, so the tone colour is only a second signal', () => {
    const events = [threatResponseEvent({ severity: 'critical', correct: false, healthAfter: 80 }, at(1000))]
    const html = renderToString(<EventFeed events={events} />)

    expect(html).toContain('Threat escalated')
    expect(html).toContain('CRITICAL')
    expect(html).toContain('event-feed__item--bad')
  })
})

describe('SystemStatus', () => {
  const risk = { value: 12, level: 'low' }

  it('names the band in words and shows the health behind it', () => {
    const html = renderToString(
      <SystemStatus worldHealth={100} ruleStates={getInitialRuleStates()} risk={risk} />
    )

    expect(html).toContain('SYSTEM STABLE')
    expect(html).toContain('100/100')
    expect(html).toContain('100%')
    expect(html).toContain('all rules on')
  })

  it('crosses into warning and critical at the documented thresholds', () => {
    const rules = getInitialRuleStates()
    expect(renderToString(<SystemStatus worldHealth={89} ruleStates={rules} risk={risk} />)).toContain('SYSTEM WARNING')
    expect(renderToString(<SystemStatus worldHealth={59} ruleStates={rules} risk={risk} />)).toContain('SYSTEM CRITICAL')
    expect(renderToString(<SystemStatus worldHealth={29} ruleStates={rules} risk={risk} />)).toContain('SYSTEM COLLAPSE')
  })

  it('reports an incomplete perimeter when a rule is off', () => {
    const rules = { ...getInitialRuleStates(), 'rate-limiting': false }
    const html = renderToString(<SystemStatus worldHealth={100} ruleStates={rules} risk={risk} />)

    expect(html).toContain('75%')
    expect(html).toContain('perimeter incomplete')
  })

  it('says none active rather than showing a bare zero', () => {
    const html = renderToString(
      <SystemStatus worldHealth={100} ruleStates={getInitialRuleStates()} risk={risk} />
    )
    expect(html).toContain('none active')
  })
})
