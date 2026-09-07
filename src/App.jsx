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
 */
export default function App() {
  const [entered, setEntered] = useState(false)

  if (!entered) {
    return <IntroScreen onEnter={() => setEntered(true)} />
  }

  return <CyberDistrict onExit={() => setEntered(false)} />
}
