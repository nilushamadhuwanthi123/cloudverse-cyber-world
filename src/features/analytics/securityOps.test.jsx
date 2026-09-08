import React from 'react'
import { describe, expect, it } from 'vitest'
import { renderToString } from 'react-dom/server'
import { accuracyBySeverity } from '../../game/securityAnalytics'
import OutcomeBar from './components/OutcomeBar'
import SeverityBars from './components/SeverityBars'
import Sparkline from './components/Sparkline'

describe('Sparkline', () => {
  it('offers an empty state rather than an empty axis', () => {
    const html = renderToString(<Sparkline values={[]} label="World health" />)
    expect(html).toContain('Nothing recorded yet')
    expect(html).not.toContain('<svg')
  })

  // A chart is a picture to one reader and a table to another. Shipping
  // only the picture leaves the second reader with nothing at all.
  it('describes its own shape in the label and repeats the numbers as a table', () => {
    const html = renderToString(
      <Sparkline values={[90, 95, 100]} label="World health" unit="%" />
    )

    expect(html).toContain('role="img"')
    expect(html).toContain('World health: rose from 90% to 100%')
    expect(html).toContain('low 90%, high 100%')
    expect(html).toContain('<table class="sr-only">')
    expect(html).toContain('<caption>')
  })

  // A dip that recovered has the same first and last value without ever
  // being flat. "fell from 10 to 10" is worse than saying nothing.
  it('does not claim a direction when the series ended where it started', () => {
    const html = renderToString(<Sparkline values={[10, 0, 10]} label="Security score" />)
    expect(html).toContain('ended where it started at 10')
    expect(html).not.toContain('fell from')
  })

  it('says a flat reading held steady instead of claiming it moved', () => {
    const html = renderToString(<Sparkline values={[70, 70]} label="Security score" />)
    expect(html).toContain('held steady at 70')
  })
})

describe('SeverityBars', () => {
  it('gives every severity a row, including ones never seen', () => {
    const html = renderToString(<SeverityBars rows={accuracyBySeverity([])} />)

    for (const severity of ['low', 'medium', 'high', 'critical']) {
      expect(html).toContain(`ops-bars__row--${severity}`)
      expect(html).toContain(`${severity} severity: none seen yet`)
    }
  })

  it('exposes each bar as a real progressbar with its counts in the label', () => {
    const rows = [{ severity: 'critical', total: 4, correct: 3, accuracy: 75 }]
    const html = renderToString(<SeverityBars rows={rows} />)

    expect(html).toContain('role="progressbar"')
    expect(html).toContain('aria-valuenow="75"')
    expect(html).toContain('3 of 4 answered correctly, 75 percent')
    expect(html).toContain('(3/4)')
  })
})

describe('OutcomeBar', () => {
  it('shows its empty label when nothing has happened', () => {
    const html = renderToString(
      <OutcomeBar parts={[{ label: 'Contained', value: 0, tone: 'good' }]} emptyLabel="No threats answered yet." />
    )
    expect(html).toContain('No threats answered yet.')
  })

  it('names every segment and its share in the accessible label', () => {
    const html = renderToString(
      <OutcomeBar
        parts={[
          { label: 'Contained', value: 3, tone: 'good' },
          { label: 'Escalated', value: 1, tone: 'bad' },
        ]}
      />
    )

    expect(html).toContain('Contained: 3 (75%), Escalated: 1 (25%)')
    expect(html).toContain('ops-outcome__segment--good')
    expect(html).toContain('ops-outcome__segment--bad')
  })
})
