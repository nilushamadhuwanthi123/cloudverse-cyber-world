import { useState } from 'react'
import IntroScreen from './features/intro/IntroScreen'
import WorldMap from './features/world/WorldMap'
import CyberDistrict from './features/cyber/CyberDistrict'
import CloudDistrict from './features/cloud/CloudDistrict'
import DevOpsPipeline from './features/devops/DevOpsPipeline'
import './App.css'

/**
 * Application shell with Central World Map and District Switcher.
 *
 * Implements the intended navigation flow:
 * INTRO -> ENTER WORLD -> WORLD MAP -> SELECT DISTRICT -> ENTER DISTRICT -> BACK TO WORLD MAP
 */
export default function App() {
  const [entered, setEntered] = useState(false)
  const [view, setView] = useState('map') // 'map' | 'cloud' | 'devops' | 'cyber'

  const handleEnterWorld = () => {
    setEntered(true)
    setView('map')
  }

  const handleExitToIntro = () => {
    setEntered(false)
    setView('map')
  }

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
              id="tab-map"
              aria-selected={view === 'map'}
              aria-controls="main-content"
              className={`district-nav__tab ${view === 'map' ? 'district-nav__tab--active' : ''}`}
              onClick={() => setView('map')}
            >
              🗺️ World Map
            </button>
            <button
              type="button"
              role="tab"
              id="tab-cloud"
              aria-selected={view === 'cloud'}
              aria-controls="main-content"
              className={`district-nav__tab ${view === 'cloud' ? 'district-nav__tab--active' : ''}`}
              onClick={() => setView('cloud')}
            >
              ☁️ Cloud District
            </button>
            <button
              type="button"
              role="tab"
              id="tab-devops"
              aria-selected={view === 'devops'}
              aria-controls="main-content"
              className={`district-nav__tab ${view === 'devops' ? 'district-nav__tab--active' : ''}`}
              onClick={() => setView('devops')}
            >
              ⚡ DevOps District
            </button>
            <button
              type="button"
              role="tab"
              id="tab-cyber"
              aria-selected={view === 'cyber'}
              aria-controls="main-content"
              className={`district-nav__tab ${view === 'cyber' ? 'district-nav__tab--active' : ''}`}
              onClick={() => setView('cyber')}
            >
              🛡️ Cyber District
            </button>
          </div>

          <button
            type="button"
            className="district-nav__exit-btn"
            onClick={view === 'map' ? handleExitToIntro : () => setView('map')}
          >
            {view === 'map' ? '← Exit to Intro' : '← Back to World Map'}
          </button>
        </nav>
      )}

      <main id="main-content" tabIndex={-1}>
        {!entered ? (
          <IntroScreen onEnter={handleEnterWorld} />
        ) : view === 'map' ? (
          <WorldMap
            onSelectDistrict={(districtId) => setView(districtId)}
            onExitToIntro={handleExitToIntro}
          />
        ) : view === 'cloud' ? (
          <CloudDistrict onBackToIntro={() => setView('map')} />
        ) : view === 'devops' ? (
          <DevOpsPipeline onBackToIntro={() => setView('map')} />
        ) : (
          <CyberDistrict onExit={() => setView('map')} />
        )}
      </main>
    </>
  )
}


