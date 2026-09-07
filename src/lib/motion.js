/**
 * anime.js helpers.
 *
 * Two things every animation in CLOUDVERSE needs, wrapped once here so no
 * component has to remember them:
 *
 *   1. Respect prefers-reduced-motion. The CSS in global.css cannot help
 *      us -- anime.js animates via JavaScript, so the media query never
 *      applies to it. For someone with a vestibular disorder, motion can
 *      cause real nausea, so we jump straight to the final state instead
 *      of playing the animation.
 *
 *   2. Be cancellable. A component that unmounts mid-animation leaves
 *      anime.js ticking against elements that no longer exist. Every
 *      helper here returns something you can stop in a useEffect cleanup.
 *
 * anime.js v4 API -- named exports, not the default `anime()` call that
 * almost every tutorial online still shows (that is v3).
 */
import { animate, createTimeline } from 'animejs'

/** True when the visitor has asked the OS for less motion. */
export function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/**
 * animate(), but honours reduced motion.
 *
 * When motion is reduced the animation still runs -- at 1ms, so it lands
 * on exactly the same final styles and any onComplete still fires. Simply
 * skipping it would leave elements stuck at their starting opacity, which
 * is how "accessible" animation code accidentally hides content.
 */
export function motion(targets, params = {}) {
  if (prefersReducedMotion()) {
    return animate(targets, { ...params, duration: 1, delay: 0, ease: 'linear' })
  }
  return animate(targets, params)
}

/**
 * createTimeline().
 *
 * No reduced-motion handling here on purpose. A timeline's `defaults`
 * are overridden by whatever each .add() passes, so shortening the
 * defaults does nothing once the calls specify their own durations --
 * which is exactly the bug this comment exists to stop someone
 * reintroducing. Build the timeline normally, then hand it to
 * settleIfReduced() once every .add() has run.
 */
export function motionTimeline(params = {}) {
  return createTimeline(params)
}

/**
 * Jumps a finished-building timeline straight to its end state when the
 * visitor has asked for reduced motion.
 *
 * Seeking rather than skipping matters: elements start at opacity 0 in
 * CSS, so a timeline that simply never plays leaves the content
 * invisible. Seeking to the end applies every final value at once.
 *
 * @returns {boolean} true if it settled the timeline, so callers can
 *   also skip whatever they would have done on completion.
 */
export function settleIfReduced(timeline) {
  if (!prefersReducedMotion()) return false
  try {
    if (timeline && typeof timeline.seek === 'function') {
      timeline.seek(timeline.duration)
    }
  } catch {
    // A timeline that cannot be seeked is not worth crashing over --
    // the caller still marks itself ready below.
  }
  return true
}

/**
 * Stops an animation or timeline if it is still running.
 *
 * Written to be safe to call with anything -- null, an already-finished
 * animation, an object from a future anime.js version with a different
 * shape. Cleanup code runs while a component is being torn down, which is
 * the worst possible moment to throw.
 */
export function stopMotion(instance) {
  try {
    if (instance && typeof instance.pause === 'function') {
      instance.pause()
    }
  } catch {
    // Nothing useful to do here, and an error during unmount would
    // surface as a confusing crash somewhere unrelated.
  }
}
