import React from 'react'
import { buildFeed } from '../../../game/eventFeed'
import './EventFeed.css'

/**
 * Live security event feed.
 *
 * The same append-only log the Analytics sector derives its charts from,
 * read the other way round. Nothing here is generated for effect: if the
 * feed is empty it is because nothing has happened yet, and it says so
 * rather than inventing plausible-looking traffic.
 *
 * Only the newest line is announced. A polite live region wrapping the
 * whole list would re-read every entry each time one arrived, which is
 * how a helpful feed becomes an unusable one.
 *
 * Each line carries the wall-clock time it was recorded rather than "3m
 * ago". Relative times need the current time, which means reading a
 * clock during render and then re-rendering to keep it honest; a
 * timestamp is a function of the event alone, so this component stays
 * pure and needs no timer.
 */
export default function EventFeed({ events = [], limit = 10 }) {
  const lines = buildFeed(events, { limit })

  if (lines.length === 0) {
    return (
      <div className="event-feed event-feed--empty">
        <p className="event-feed__empty-status">NO ACTIVITY RECORDED</p>
        <p className="event-feed__empty-note">
          Answer a threat, toggle a defense rule, or close an investigation.
          Each one writes a line here.
        </p>
      </div>
    )
  }

  const [newest] = lines

  return (
    <div className="event-feed">
      <p className="sr-only" role="status" aria-live="polite">
        {`${newest.headline}. ${newest.detail}`}
      </p>

      {/* The list scrolls once the log outgrows it, so it has to be
          reachable by keyboard -- axe flags a scrollable region nobody
          can focus, and it is right: a mouse wheel is not an input
          method everyone has. The label says what the region is, since
          a bare focusable box announces nothing. No role override
          here: putting role="group" on the <ol> strips its list
          semantics and orphans every <li> inside it. */}
      <ol
        className="event-feed__list"
        tabIndex={0}
        aria-label={`Security event feed, ${lines.length} recent event${lines.length === 1 ? '' : 's'}`}
      >
        {lines.map((line, index) => (
          <li
            key={line.id ?? `${line.at}-${index}`}
            className={`event-feed__item event-feed__item--${line.tone}`}
          >
            <span className="event-feed__tag">{line.tag}</span>
            <span className="event-feed__body">
              <span className="event-feed__headline">{line.headline}</span>
              <span className="event-feed__detail">{line.detail}</span>
            </span>
            <span className="event-feed__when">{line.when}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}
