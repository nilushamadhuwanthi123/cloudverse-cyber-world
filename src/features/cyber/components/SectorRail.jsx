import React, { useRef } from 'react'
import { SECTOR_STATE } from '../../../game/cyberNavigation'
import './SectorRail.css'

const STATE_LABEL = {
  [SECTOR_STATE.ONLINE]: 'ONLINE',
  [SECTOR_STATE.LOCKED]: 'LOCKED',
  [SECTOR_STATE.PLANNED]: 'OFFLINE',
}

/**
 * The Cyber District's sector rail.
 *
 * A real tablist, with the keyboard behaviour the pattern promises:
 * arrows move between sectors, Home and End jump to the ends, and only
 * the selected tab is in the tab order, so Tab leaves the rail rather
 * than walking through nine items to reach the content.
 *
 * Locked and offline sectors stay selectable rather than being removed
 * from the rail or made unfocusable. Selecting one shows a panel saying
 * what it is and why it is not open -- which is information, where a
 * dead control is only frustration.
 *
 * They deliberately do not carry aria-disabled. That attribute promises
 * a control that does nothing, and these do something useful; the state
 * reaches assistive technology through the ONLINE / LOCKED / OFFLINE
 * word inside the tab, which is part of its accessible name and is not
 * carried by colour alone.
 */
export default function SectorRail({ sectors, activeId, onSelect }) {
  const railRef = useRef(null)

  function focusTabAt(index) {
    const tabs = railRef.current?.querySelectorAll('[role="tab"]')
    if (!tabs?.length) return
    const wrapped = (index + tabs.length) % tabs.length
    tabs[wrapped].focus()
    onSelect(sectors[wrapped].id)
  }

  function handleKeyDown(event, index) {
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        event.preventDefault()
        focusTabAt(index + 1)
        break
      case 'ArrowUp':
      case 'ArrowLeft':
        event.preventDefault()
        focusTabAt(index - 1)
        break
      case 'Home':
        event.preventDefault()
        focusTabAt(0)
        break
      case 'End':
        event.preventDefault()
        focusTabAt(sectors.length - 1)
        break
      default:
        break
    }
  }

  return (
    <div
      className="sector-rail"
      role="tablist"
      aria-orientation="vertical"
      aria-label="Cyber District sectors"
      ref={railRef}
    >
      {sectors.map((sector, index) => {
        const selected = sector.id === activeId

        return (
          <button
            key={sector.id}
            type="button"
            role="tab"
            id={`sector-tab-${sector.id}`}
            aria-controls={`sector-panel-${sector.id}`}
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            className={`sector-rail__item sector-rail__item--${sector.state} ${
              selected ? 'sector-rail__item--selected' : ''
            }`}
            onClick={() => onSelect(sector.id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
          >
            <span className="sector-rail__code" aria-hidden="true">{sector.code}</span>
            <span className="sector-rail__body">
              <span className="sector-rail__label">{sector.label}</span>
              <span className="sector-rail__tagline">{sector.tagline}</span>
            </span>
            <span className={`sector-rail__state sector-rail__state--${sector.state}`}>
              {STATE_LABEL[sector.state]}
            </span>
          </button>
        )
      })}
    </div>
  )
}
