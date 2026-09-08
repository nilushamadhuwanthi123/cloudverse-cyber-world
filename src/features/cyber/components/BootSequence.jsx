import React, { useEffect, useRef, useState } from 'react'
import { prefersReducedMotion } from '../../../lib/motion'
import './BootSequence.css'

export const BOOT_LINES = [
  'SECURE CHANNEL ESTABLISHED',
  'CYBER OPERATIONS ONLINE',
  'THREAT MONITOR INITIALIZING',
  'DEFENSE SYSTEMS SYNCHRONIZING',
]

const LINE_INTERVAL_MS = 320

/**
 * District entry sequence.
 *
 * Four lines land in turn, then the interface appears. It is theatre,
 * and theatre that blocks the interface has to be honest about it:
 *
 *  - A Skip button is the first thing focused, so nobody is held here.
 *  - Reduced motion skips it outright rather than playing it faster --
 *    someone who asked for less motion asked for less of this, not a
 *    brisker version of it.
 *  - The lines are one polite live region, announced as they arrive
 *    rather than as four separate interruptions.
 *
 * Timers are cleared on unmount, so leaving the district mid-sequence
 * cannot call back into a component that is gone.
 */
export default function BootSequence({ onComplete, lines = BOOT_LINES }) {
  const [shown, setShown] = useState(0)
  const timerRef = useRef(null)
  const skipRef = useRef(null)

  useEffect(() => {
    if (prefersReducedMotion()) {
      onComplete()
      return undefined
    }

    skipRef.current?.focus()
    return undefined
    // Focus once, on mount. onComplete is stable in practice, and
    // re-running this would steal focus back mid-sequence.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (prefersReducedMotion()) return undefined

    if (shown >= lines.length) {
      timerRef.current = setTimeout(onComplete, LINE_INTERVAL_MS)
      return () => clearTimeout(timerRef.current)
    }

    timerRef.current = setTimeout(() => setShown((current) => current + 1), LINE_INTERVAL_MS)
    return () => clearTimeout(timerRef.current)
  }, [shown, lines.length, onComplete])

  return (
    <div className="boot" role="group" aria-label="Cyber District startup">
      <p className="boot__eyebrow">CYBER DISTRICT</p>

      <ol className="boot__lines" aria-live="polite">
        {lines.slice(0, shown).map((line) => (
          <li key={line} className="boot__line">
            <span className="boot__marker" aria-hidden="true">&gt;</span>
            {line}
            <span className="boot__ok">OK</span>
          </li>
        ))}
      </ol>

      <button type="button" className="boot__skip" onClick={onComplete} ref={skipRef}>
        Skip startup
      </button>
    </div>
  )
}
