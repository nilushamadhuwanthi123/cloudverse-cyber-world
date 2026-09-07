import { useState } from 'react'
import IntroScreen from './features/intro/IntroScreen'
import CloudDistrict from './features/cloud/CloudDistrict'
import CyberDistrict from './features/cyber/CyberDistrict'
import './App.css'

/**
 * Application shell.
 *
 * "Which screen am I on" is application state, not a URL -- CLOUDVERSE is
 * one continuous world rather than a set of pages, so there is no router
 * here on purpose. This stays a plain useState until the world map in
 * Phase 4 gives it something more to track.
 *
 * Two districts exist now, and the world map that will route between
 * them properly does not, so the intro leads to a temporary chooser
 * rather than to one hard-coded district. It is deliberately plain: the
 * moment the world map lands, this whole branch is deleted rather than
 * restyled.
 *
 * The <main> landmark and skip link live here rather than in each
 * screen: there is exactly one main region in the app at a time, and
 * putting it at the shell means a screen that gets added later cannot
 * forget it. The skip link is the first thing in the tab order so a
 * keyboard user can jump the panels instead of walking every control.
 */
export default function App() {
  const [screen, setScreen] = useState('intro')

  const backToChooser = () => setScreen('chooser')

  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <main id="main-content" tabIndex={-1}>
        {screen === 'intro' && <IntroScreen onEnter={() => setScreen('chooser')} />}
        {screen === 'cyber' && <CyberDistrict onExit={backToChooser} />}
        {screen === 'cloud' && <CloudDistrict onBackToIntro={backToChooser} />}
        {screen === 'chooser' && (
          <section className="district-chooser" aria-labelledby="district-chooser-title">
            <h1 id="district-chooser-title" className="district-chooser__title">
              Choose a district
            </h1>
            <p className="district-chooser__note">
              The world map arrives in a later phase. Until then, pick a
              district directly.
            </p>
            <div className="district-chooser__options">
              <button
                type="button"
                className="district-chooser__option"
                onClick={() => setScreen('cyber')}
              >
                🛡 Cyber District
              </button>
              <button
                type="button"
                className="district-chooser__option"
                onClick={() => setScreen('cloud')}
              >
                ☁ Cloud District
              </button>
            </div>
          </section>
        )}
      </main>
    </>
  )
}
