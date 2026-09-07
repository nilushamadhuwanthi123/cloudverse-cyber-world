import { useState } from 'react'
import IntroScreen from './features/intro/IntroScreen'
import CloudDistrict from './features/cloud/CloudDistrict'

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

  return <CloudDistrict onBackToIntro={() => setEntered(false)} />
}

