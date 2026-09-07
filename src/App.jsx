import { useState } from 'react'
import IntroScreen from './features/intro/IntroScreen'
import CyberDistrict from './features/cyber/CyberDistrict'
import CloudDistrict from './features/cloud/CloudDistrict'
import './App.css'

/**
 * Application shell with District Switcher.
 *
 * Allows exploration of both Cloud District (District 01) and
 * Cyber District (District 02) until the full Phase 4 World Map
 * is implemented.
 */
export default function App() {
  const [entered, setEntered] = useState(false)
  const [district, setDistrict] = useState('cloud')

  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>

      {entered && (
        <nav className="district-nav" aria-label="District Navigation">
          <div className="district-nav__brand">
            <span className="district-nav__tag">
              <span className="district-nav__pulse" aria-hidden="true" />
              CLOUDVERSE // SECTOR HUB
            </span>
          </div>

          <div className="district-nav__tabs" role="tablist" aria-label="Districts">
            <button
              type="button"
              role="tab"
              id="tab-cloud"
              aria-selected={district === 'cloud'}
              aria-controls="main-content"
              className={`district-nav__tab ${district === 'cloud' ? 'district-nav__tab--active' : ''}`}
              onClick={() => setDistrict('cloud')}
            >
              ☁️ Cloud District
            </button>
            <button
              type="button"
              role="tab"
              id="tab-cyber"
              aria-selected={district === 'cyber'}
              aria-controls="main-content"
              className={`district-nav__tab ${district === 'cyber' ? 'district-nav__tab--active' : ''}`}
              onClick={() => setDistrict('cyber')}
            >
              🛡️ Cyber District
            </button>
          </div>

          <button
            type="button"
            className="district-nav__exit-btn"
            onClick={() => setEntered(false)}
          >
            &larr; Exit to Intro
          </button>
        </nav>
      )}

      <main id="main-content" tabIndex={-1}>
        {!entered ? (
          <IntroScreen onEnter={() => setEntered(true)} />
        ) : district === 'cloud' ? (
          <CloudDistrict onBackToIntro={() => setEntered(false)} />
        ) : (
          <CyberDistrict onExit={() => setEntered(false)} />
        )}
      </main>
    </>
  )
}


