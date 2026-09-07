import { useEffect, useRef, useState } from 'react'
import { stagger } from 'animejs'
import {
  motionTimeline,
  prefersReducedMotion,
  settleIfReduced,
  stopMotion,
} from '../../lib/motion'
import './IntroScreen.css'

/**
 * The first thing a visitor sees.
 *
 * Its job is to answer "what is this?" in about three seconds. A visitor
 * who lands straight on a dashboard reads the project as another React
 * admin panel; the point of CLOUDVERSE is that it should read as a place
 * you enter. That impression is formed before anything is clicked, which
 * is why the intro exists at all rather than being decoration.
 *
 * The boot lines are theatre, but honest theatre -- they name the three
 * districts the world actually contains, so the sequence doubles as an
 * explanation of what is inside.
 */

const BOOT_LINES = [
  'ESTABLISHING UPLINK',
  'MOUNTING CLOUD DISTRICT',
  'SYNCING DEVOPS PIPELINE',
  'ARMING CYBER DEFENCES',
  'WORLD READY',
]

export default function IntroScreen({ onEnter }) {
  const rootRef = useRef(null)
  const timelineRef = useRef(null)
  // Someone on reduced motion has no sequence to sit through, so the
  // button starts enabled. Deriving that here rather than calling
  // setReady inside the effect avoids an extra render on first paint.
  const [ready, setReady] = useState(prefersReducedMotion)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    // Scope every selector to this component's DOM. A bare '.intro-line'
    // would also match anything else on the page using that class.
    const q = (selector) => root.querySelectorAll(selector)

    const tl = motionTimeline({
      defaults: { ease: 'out(3)' },
      onComplete: () => setReady(true),
    })

    tl.add(q('.intro__logo'), {
      opacity: [0, 1],
      scale: [0.94, 1],
      filter: ['blur(14px)', 'blur(0px)'],
      duration: 900,
    })
      .add(q('.intro__tagline'), { opacity: [0, 1], y: [12, 0], duration: 600 }, '-=350')
      .add(
        q('.intro__line'),
        { opacity: [0, 1], x: [-14, 0], duration: 340, delay: stagger(160) },
        '-=200',
      )
      .add(q('.intro__enter'), { opacity: [0, 1], scale: [0.9, 1], duration: 500 }, '-=120')

    timelineRef.current = tl

    // Reduced motion: jump to the end rather than play. This has to
    // happen after every .add() above, because the timeline's duration
    // is only known once it is fully built. Without it the elements
    // stay at the opacity: 0 their CSS starts them at, and the screen
    // reads as blank.
    settleIfReduced(tl)

    // Without this, leaving the intro early leaves anime.js animating
    // elements React has already removed.
    return () => stopMotion(timelineRef.current)
  }, [])

  // Someone who does not want to sit through the sequence should not have
  // to. Skipping jumps to the end rather than cutting it short, so the
  // final styles are the same either way.
  function skip() {
    const tl = timelineRef.current
    if (tl && typeof tl.seek === 'function' && typeof tl.duration === 'number') {
      tl.seek(tl.duration)
    }
    setReady(true)
  }

  return (
    <section
      ref={rootRef}
      className="intro"
      aria-labelledby="intro-title"
      onClick={ready ? undefined : skip}
    >
      <div className="intro__glow" aria-hidden="true" />

      <div className="intro__content">
        <h1 id="intro-title" className="intro__logo">
          CLOUDVERSE
        </h1>

        <p className="intro__tagline">Enter the digital world</p>

        {/* aria-live so a screen reader hears the boot sequence rather
            than silence while it plays. */}
        <ul className="intro__boot" aria-live="polite">
          {BOOT_LINES.map((line) => (
            <li key={line} className="intro__line">
              <span className="intro__line-marker" aria-hidden="true">
                &gt;
              </span>
              {line}
            </li>
          ))}
        </ul>

        <button
          type="button"
          className="intro__enter"
          onClick={onEnter}
          disabled={!ready}
        >
          ENTER
        </button>

        {!ready && (
          <p className="intro__skip-hint">Click anywhere to skip</p>
        )}
      </div>
    </section>
  )
}
