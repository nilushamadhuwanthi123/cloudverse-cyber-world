import React, { useMemo, useState } from 'react'
import {
  correlate,
  findActor,
  indicatorBoard,
  readIndicator,
} from '../../../game/threatIntel'
import './IntelWorkspace.css'

const KIND_LABEL = {
  ip: 'ADDRESS',
  account: 'ACCOUNT',
  token: 'TOKEN',
  hash: 'HASH',
  artifact: 'OBJECT',
  indicator: 'INDICATOR',
}

/**
 * Security Intelligence.
 *
 * Pick an indicator and walk what is known about it: which actor lists
 * it, which campaign it belongs to, which patterns that actor works in,
 * and -- the part that matters -- where in *this* run you saw it.
 *
 * Indicators the player flagged during a forensic investigation are
 * marked and sorted first, read back out of the security event log
 * rather than tracked separately. An indicator nobody here has anything
 * on is still listed if the player found it, because "you found
 * something we have nothing on" is a real state and hiding it would
 * quietly say the find did not count.
 *
 * The chain is drawn as connected stages, but every stage is also a
 * heading and a list. The connectors are aria-hidden: they repeat what
 * the reading order already says.
 */
export default function IntelWorkspace({ events = [] }) {
  const board = useMemo(() => indicatorBoard(events), [events])
  const [selected, setSelected] = useState(() => board[0]?.indicator ?? null)

  const entry = board.find((item) => item.indicator === selected) ?? null
  const chain = selected ? correlate(selected) : null
  const seenCount = board.filter((item) => item.seen).length

  return (
    <div className="intel">
      <div className="intel__readouts">
        <span>
          Indicators on file: <strong>{board.length}</strong>
        </span>
        <span>
          Seen in this run: <strong>{seenCount}</strong>
          {seenCount === 0 && (
            <span className="intel__readout-note">
              {' '}— flag indicators in Digital Forensics and they appear here
            </span>
          )}
        </span>
      </div>

      <div className="intel__layout">
        <div className="intel__list-column">
          <h3 className="intel__column-title">Indicators</h3>
          <ul className="intel__list">
            {board.map((item) => {
              const { kind, value } = readIndicator(item.indicator)

              return (
                <li key={item.indicator}>
                  <button
                    type="button"
                    data-cursor="inspect"
                    className={`intel__indicator ${
                      item.indicator === selected ? 'intel__indicator--selected' : ''
                    } ${item.seen ? 'intel__indicator--seen' : ''}`}
                    aria-pressed={item.indicator === selected}
                    onClick={() => setSelected(item.indicator)}
                  >
                    <span className="intel__indicator-kind">{KIND_LABEL[kind] ?? kind}</span>
                    <span className="intel__indicator-value">{value}</span>
                    <span className="intel__indicator-state">
                      {item.seen ? `seen · ${item.caseIds.join(', ') || 'this run'}` : 'not seen yet'}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>

        <div className="intel__chain">
          {!chain ? (
            <p className="intel__empty">Select an indicator to correlate it.</p>
          ) : !chain.known ? (
            <section className="intel__stage cv-panel" aria-labelledby="intel-unknown-heading">
              <h3 id="intel-unknown-heading" className="intel__stage-title">
                Nothing on file
              </h3>
              <p className="intel__stage-note">
                {readIndicator(chain.indicator).value} does not appear in any actor
                profile or campaign this sector holds.
                {entry?.seen
                  ? ' You flagged it during an investigation, so it is recorded here as an open question rather than dropped.'
                  : ''}
              </p>
            </section>
          ) : (
            <>
              <section className="intel__stage cv-panel" aria-labelledby="intel-actor-heading">
                <p className="intel__stage-step">STAGE 01 · ATTRIBUTION</p>
                <h3 id="intel-actor-heading" className="intel__stage-title">
                  {chain.actors.length === 1 ? 'Attributed actor' : 'Attributed actors'}
                </h3>
                <ul className="intel__cards">
                  {chain.actors.map((actor) => (
                    <li key={actor.id} className="intel__card">
                      <span className="intel__codename">{actor.codename}</span>
                      <p className="intel__card-text">{actor.summary}</p>
                      <dl className="intel__facts">
                        <div>
                          <dt>Motivation</dt>
                          <dd>{actor.motivation}</dd>
                        </div>
                        <div>
                          <dt>First seen</dt>
                          <dd>{actor.firstSeen}</dd>
                        </div>
                      </dl>
                    </li>
                  ))}
                </ul>
              </section>

              <div className="intel__link" aria-hidden="true" />

              <section className="intel__stage cv-panel" aria-labelledby="intel-campaign-heading">
                <p className="intel__stage-step">STAGE 02 · CAMPAIGN</p>
                <h3 id="intel-campaign-heading" className="intel__stage-title">
                  Activity this indicator belongs to
                </h3>
                {chain.campaigns.length === 0 ? (
                  <p className="intel__stage-note">
                    Attributed, but not tied to a named campaign.
                  </p>
                ) : (
                  <ul className="intel__cards">
                    {chain.campaigns.map((campaign) => {
                      const actor = findActor(campaign.actorId)

                      return (
                        <li key={campaign.id} className="intel__card">
                          <span className="intel__codename">{campaign.name}</span>
                          <p className="intel__card-text">{campaign.summary}</p>
                          <dl className="intel__facts">
                            <div>
                              <dt>Window</dt>
                              <dd>{campaign.window}</dd>
                            </div>
                            <div>
                              <dt>Attributed to</dt>
                              <dd>{actor?.codename ?? 'unattributed'}</dd>
                            </div>
                            <div>
                              <dt>Related case files</dt>
                              <dd>
                                {campaign.relatedCaseIds.length > 0
                                  ? campaign.relatedCaseIds.join(', ')
                                  : 'none'}
                              </dd>
                            </div>
                          </dl>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </section>

              <div className="intel__link" aria-hidden="true" />

              <section className="intel__stage cv-panel" aria-labelledby="intel-pattern-heading">
                <p className="intel__stage-step">STAGE 03 · PATTERNS</p>
                <h3 id="intel-pattern-heading" className="intel__stage-title">
                  How this actor tends to work
                </h3>
                <ul className="intel__patterns">
                  {chain.patterns.map((pattern) => (
                    <li key={pattern.id} className="intel__pattern">
                      <span className="intel__pattern-name">{pattern.name}</span>
                      <p className="intel__card-text">{pattern.summary}</p>
                      <p className="intel__tell">
                        <span className="intel__tell-label">What gives it away</span>
                        {pattern.tell}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>

              <div className="intel__link" aria-hidden="true" />

              <section className="intel__stage cv-panel" aria-labelledby="intel-run-heading">
                <p className="intel__stage-step">STAGE 04 · THIS RUN</p>
                <h3 id="intel-run-heading" className="intel__stage-title">
                  Where you saw it
                </h3>
                {entry?.seen ? (
                  <p className="intel__stage-note">
                    You flagged this indicator while closing{' '}
                    <strong>{entry.caseIds.join(', ')}</strong> in Digital Forensics.
                    Everything above is what the sector already held about it before
                    you did.
                  </p>
                ) : (
                  <p className="intel__stage-note">
                    Not seen in this run. Work a case in Digital Forensics and flag
                    this indicator, and it will be recorded here — intelligence you
                    have not observed is background reading, not evidence.
                  </p>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
