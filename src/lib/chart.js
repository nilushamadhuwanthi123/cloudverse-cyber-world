/**
 * Chart geometry.
 *
 * The maths that turns a list of numbers into SVG coordinates, kept out
 * of the components that draw them. A path string is easy to get subtly
 * wrong -- an off-by-one on the last point, a divide-by-zero on a flat
 * series -- and those are much easier to catch as assertions on a
 * returned array than by squinting at a rendered line.
 *
 * No charting dependency: these are a few dozen lines of arithmetic and
 * some <path> elements, which is a smaller thing to own than a library.
 */

/** Rounds to two decimals so path strings stay short and readable. */
function round(value) {
  return Math.round(value * 100) / 100
}

/**
 * Maps a series of values onto a sparkline.
 *
 * Returns null for an empty series so the caller renders an empty state
 * rather than an axis with nothing on it.
 *
 * A flat series (every value equal, including a single point) is drawn
 * through the vertical middle. Scaling it to the full height instead
 * would draw a dramatic line for a number that never moved.
 */
export function sparkline(values = [], { width = 280, height = 64, padding = 6 } = {}) {
  const numbers = values.filter((value) => typeof value === 'number' && Number.isFinite(value))
  if (numbers.length === 0) return null

  const min = Math.min(...numbers)
  const max = Math.max(...numbers)
  const flat = min === max

  const innerWidth = width - padding * 2
  const innerHeight = height - padding * 2

  const x = (index) =>
    numbers.length === 1
      ? round(padding + innerWidth / 2)
      : round(padding + (index / (numbers.length - 1)) * innerWidth)

  // SVG y grows downward, so a high value has to map to a small y.
  const y = (value) =>
    flat
      ? round(padding + innerHeight / 2)
      : round(padding + (1 - (value - min) / (max - min)) * innerHeight)

  const points = numbers.map((value, index) => ({ x: x(index), y: y(value), value }))

  const path = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x} ${point.y}`)
    .join(' ')

  // Closed back along the baseline so the same shape can be filled as
  // a soft area under the line.
  const area =
    points.length > 1
      ? `${path} L${points[points.length - 1].x} ${height - padding} L${points[0].x} ${height - padding} Z`
      : null

  return { points, path, area, min, max, flat, width, height }
}

/**
 * Splits a track into proportional segments.
 *
 * Whole percentages only -- "71.42%" reads as precision this is not
 * measuring. Each share is floored and the last segment absorbs the
 * remainder, so the segments always total exactly 100 and the bar never
 * shows a sliver of background that looks like a third category.
 */
export function stackedSegments(parts = []) {
  const total = parts.reduce((sum, part) => sum + Math.max(0, part.value || 0), 0)
  if (total <= 0) return []

  let used = 0
  return parts.map((part, index) => {
    const isLast = index === parts.length - 1
    const percent = isLast
      ? 100 - used
      : Math.floor((Math.max(0, part.value || 0) / total) * 100)
    used += percent
    return { ...part, percent }
  })
}
