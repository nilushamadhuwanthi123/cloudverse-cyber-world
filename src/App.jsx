import { useState } from 'react'
import IntroScreen from './features/intro/IntroScreen'

/**
 * Application shell.
 *
 * "Which screen am I on" is application state, not a URL -- CLOUDVERSE is
 * one continuous world rather than a set of pages, so there is no router
 * here on purpose. This stays a plain useState until the world map in
 * Phase 4 gives it something more to track.
 */
export default function App() {
  const [entered, setEntered] = useState(false)

  if (!entered) {
    return <IntroScreen onEnter={() => setEntered(true)} />
  }

  // Placeholder until Phase 4 builds the world map.
  return (
    <main className="app-placeholder">
      <p>World map arrives in Phase 4.</p>
      <button type="button" onClick={() => setEntered(false)}>
        Back to intro
      </button>
    </main>
  )
}
