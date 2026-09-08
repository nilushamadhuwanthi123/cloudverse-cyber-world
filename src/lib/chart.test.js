import { describe, expect, it } from 'vitest'
import { sparkline, stackedSegments } from './chart'

describe('sparkline', () => {
  it('returns nothing for an empty series, so the caller can show an empty state', () => {
    expect(sparkline([])).toBeNull()
    expect(sparkline([null, undefined, NaN])).toBeNull()
  })

  it('maps the highest value to the top of the box and the lowest to the bottom', () => {
    const geo = sparkline([0, 50, 100], { width: 100, height: 100, padding: 0 })

    expect(geo.points[0].y).toBe(100)
    expect(geo.points[2].y).toBe(0)
    expect(geo.points[1].y).toBe(50)
  })

  it('spreads points evenly from the left edge to the right edge', () => {
    const geo = sparkline([1, 2, 3], { width: 100, height: 50, padding: 0 })
    expect(geo.points.map((point) => point.x)).toEqual([0, 50, 100])
  })

  // A value that never moved is a flat line, not a dramatic one. Scaling
  // it to the full height would invent a rise that did not happen.
  it('draws a flat series through the middle rather than scaling it', () => {
    const geo = sparkline([70, 70, 70], { width: 100, height: 100, padding: 0 })

    expect(geo.flat).toBe(true)
    expect(geo.points.every((point) => point.y === 50)).toBe(true)
    expect(geo.min).toBe(70)
    expect(geo.max).toBe(70)
  })

  it('centres a single reading and draws no fillable area for it', () => {
    const geo = sparkline([42], { width: 100, height: 40, padding: 0 })

    expect(geo.points).toHaveLength(1)
    expect(geo.points[0].x).toBe(50)
    expect(geo.area).toBeNull()
  })

  it('starts its path with a move and continues with lines', () => {
    const geo = sparkline([1, 5, 3])
    expect(geo.path.startsWith('M')).toBe(true)
    expect(geo.path.match(/L/g)).toHaveLength(2)
  })

  it('closes the area back along the baseline', () => {
    const geo = sparkline([1, 5], { width: 100, height: 50, padding: 5 })
    expect(geo.area.endsWith('Z')).toBe(true)
    expect(geo.area).toContain('45')
  })
})

describe('stackedSegments', () => {
  it('returns nothing when there is nothing to split', () => {
    expect(stackedSegments([])).toEqual([])
    expect(stackedSegments([{ label: 'a', value: 0 }])).toEqual([])
  })

  // Rounding each share independently leaves a sliver of track showing,
  // which reads as a category nobody defined.
  it('always totals exactly 100', () => {
    const thirds = stackedSegments([
      { label: 'a', value: 1 },
      { label: 'b', value: 1 },
      { label: 'c', value: 1 },
    ])

    expect(thirds.reduce((sum, part) => sum + part.percent, 0)).toBe(100)
  })

  it('keeps the labels and tones it was given', () => {
    const parts = stackedSegments([
      { label: 'Contained', value: 3, tone: 'good' },
      { label: 'Escalated', value: 1, tone: 'bad' },
    ])

    expect(parts[0]).toMatchObject({ label: 'Contained', tone: 'good', percent: 75 })
    expect(parts[1]).toMatchObject({ label: 'Escalated', tone: 'bad', percent: 25 })
  })

  it('treats a negative value as nothing rather than reversing the bar', () => {
    const parts = stackedSegments([
      { label: 'a', value: 4 },
      { label: 'b', value: -2 },
    ])

    expect(parts[0].percent).toBe(100)
    expect(parts[1].percent).toBe(0)
  })
})
