import React, { useEffect, useRef, useState } from 'react'
import { CURSOR_STATE, approach, cursorStateFor, supportsCustomCursor } from '../lib/cursor'
import { prefersReducedMotion } from '../lib/motion'
import './CursorLayer.css'

/**
 * The CLOUDVERSE cursor.
 *
 * A dot that tracks the pointer exactly and a ring that trails it,
 * wearing one of six states depending on what is underneath. The states
 * carry meaning the interface already has and normally discards: whether
 * the next click inspects something, takes a scored action, or does
 * something destructive.
 *
 * Three rules it does not break:
 *
 *  - **It is never required.** Every state it shows is also visible in
 *    the element itself -- a disabled button looks disabled, a block
 *    button says Block. A keyboard user loses nothing by never seeing
 *    this, and focus styling is untouched.
 *  - **Touch gets the native cursor.** There is no cursor to improve on
 *    a coarse pointer, and hiding the native one there would leave
 *    someone with nothing.
 *  - **Reduced motion means no trail.** The ring pins to the pointer
 *    instead of easing toward it, and the animation loop never starts.
 *
 * The layer is `pointer-events: none` throughout, so it cannot intercept
 * a click meant for the page underneath.
 */
export default function CursorLayer() {
  // Decided once, at the first render, rather than in an effect that
  // then has to set state and force a second one. The answer cannot
  // change without the pointer hardware changing.
  const [enabled] = useState(supportsCustomCursor)
  const dotRef = useRef(null)
  const ringRef = useRef(null)
  const frameRef = useRef(null)
  const stateRef = useRef(CURSOR_STATE.NORMAL)
  const pointer = useRef({ x: -100, y: -100 })
  const ring = useRef({ x: -100, y: -100 })

  useEffect(() => {
    if (!enabled) return undefined

    document.documentElement.classList.add('has-cloudverse-cursor')

    const eased = !prefersReducedMotion()

    function place() {
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${pointer.current.x}px, ${pointer.current.y}px, 0)`
      }
      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${ring.current.x}px, ${ring.current.y}px, 0)`
      }
    }

    function onMove(event) {
      pointer.current = { x: event.clientX, y: event.clientY }

      // Reduced motion: no trail, so the ring is simply where the
      // pointer is and no loop is needed to get it there.
      if (!eased) {
        ring.current = { ...pointer.current }
        place()
      }

      const next = cursorStateFor(event.target)
      if (next !== stateRef.current) {
        stateRef.current = next
        for (const node of [dotRef.current, ringRef.current]) {
          if (node) node.dataset.state = next
        }
      }
    }

    function onLeave() {
      for (const node of [dotRef.current, ringRef.current]) {
        if (node) node.dataset.away = 'true'
      }
    }

    function onEnter() {
      for (const node of [dotRef.current, ringRef.current]) {
        if (node) delete node.dataset.away
      }
    }

    function onDown() {
      for (const node of [dotRef.current, ringRef.current]) {
        if (node) node.dataset.pressed = 'true'
      }
    }

    function onUp() {
      for (const node of [dotRef.current, ringRef.current]) {
        if (node) delete node.dataset.pressed
      }
    }

    // The loop exists only to ease the ring. Without easing there is
    // nothing for it to do, so it never starts -- an animation frame
    // running forever to compute a value that does not change is a
    // battery cost with no output.
    function tick() {
      ring.current = {
        x: approach(ring.current.x, pointer.current.x),
        y: approach(ring.current.y, pointer.current.y),
      }
      place()
      frameRef.current = requestAnimationFrame(tick)
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerdown', onDown, { passive: true })
    window.addEventListener('pointerup', onUp, { passive: true })
    document.addEventListener('pointerleave', onLeave)
    document.addEventListener('pointerenter', onEnter)

    if (eased) frameRef.current = requestAnimationFrame(tick)

    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup', onUp)
      document.removeEventListener('pointerleave', onLeave)
      document.removeEventListener('pointerenter', onEnter)
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
      document.documentElement.classList.remove('has-cloudverse-cursor')
    }
  }, [enabled])

  if (!enabled) return null

  return (
    <div className="cursor" aria-hidden="true">
      <span ref={ringRef} className="cursor__ring" data-state="normal" />
      <span ref={dotRef} className="cursor__dot" data-state="normal" />
    </div>
  )
}
