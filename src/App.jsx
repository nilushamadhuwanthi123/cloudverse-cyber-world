import { useState } from 'react'
import IntroScreen from './features/intro/IntroScreen'
import CyberDistrict from './features/cyber/CyberDistrict'

/**
 * Application shell.
 *
 * "Which screen am I on" is application state, not a URL -- CLOUDVERSE is
 * one continuous world rather than a set of pages, so there is no router
 * here on purpose. This stays a plain useState until the world map in
 * Phase 4 gives it something more to track.
 *
 * Cyber District is wired in directly for now as a temporary shortcut
 * past the intro -- Phase 4's world map is what will actually route
 * visitors to each district once it exists.
 *
 * The <main> landmark and skip link live here rather than in each
 * screen: there is exactly one main region in the app at a time, and
 * putting it at the shell means a screen that gets added later cannot
 * forget it. The skip link is the first thing in the tab order so a
 * keyboard user can jump the panels instead of walking every control.
 */
export default function App() {
  const [entered, setEntered] = useState(false)

  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <main id="main-content" tabIndex={-1}>
        {entered ? (
          <CyberDistrict onExit={() => setEntered(false)} />
        ) : (
          <IntroScreen onEnter={() => setEntered(true)} />
        )}
      </main>
    </>
  )
}
