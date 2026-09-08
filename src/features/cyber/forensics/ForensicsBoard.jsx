import React, { useMemo, useState } from 'react'
import { FORENSIC_CASES } from '../../../data/forensicCases'
import {
  checkConclusion,
  correctConclusion,
  findArtifact,
  pickForensicCase,
  scoreInvestigation,
  traceConnection,
} from '../../../game/forensics'
import './ForensicsBoard.css'

const KIND_LABEL = {
  file: 'FILE',
  process: 'PROCESS',
  connection: 'CONNECTION',
  account: 'ACCOUNT',
  log: 'LOG',
}

/**
 * Digital Forensics: the evidence board.
 *
 * A responder is not handed a diagram. They are handed records, and the
 * diagram is what they build by noticing that two of them mention the
 * same address. So nothing is drawn between artefacts until the player
 * traces it, and a trace only succeeds when the two records genuinely
 * share an indicator -- that check lives in game/forensics.js, derived
 * from the evidence rather than from a list of edges someone authored.
 *
 * The drawing is the bonus, not the truth. Every artefact is a real
 * button in a list, every traced connection is also written out in
 * words underneath, and the SVG that joins them is aria-hidden. On a
 * narrow screen the positioning is dropped entirely and the same board
 * reads as a plain list -- nothing is lost, because nothing was only
 * ever in the picture.
 */
export default function ForensicsBoard({ onCaseClosed }) {
  const [seenIds, setSeenIds] = useState([])
  const [forensicCase, setForensicCase] = useState(() => pickForensicCase(FORENSIC_CASES, []))
  const [selectedId, setSelectedId] = useState(null)
  const [traceFromId, setTraceFromId] = useState(null)
  const [traced, setTraced] = useState([])
  const [flagged, setFlagged] = useState([])
  const [notice, setNotice] = useState('')
  const [verdict, setVerdict] = useState(null)

  const selected = findArtifact(forensicCase.artifacts, selectedId)
  const score = useMemo(
    () => scoreInvestigation(forensicCase, traced.map((link) => link.key), flagged),
    [forensicCase, traced, flagged]
  )

  // Indicators the player has actually seen, so the tray cannot give
  // away a record they have not opened.
  const revealedIndicators = useMemo(() => {
    const seen = new Set()
    for (const link of traced) link.via.forEach((indicator) => seen.add(indicator))
    return [...seen]
  }, [traced])

  function inspect(id) {
    setSelectedId(id)
    const artifact = findArtifact(forensicCase.artifacts, id)
    setNotice(`Inspecting ${artifact?.label ?? 'record'}.`)
  }

  function startTrace() {
    setTraceFromId(selectedId)
    setNotice(`Tracing from ${selected.label}. Choose the record to trace it to.`)
  }

  function completeTrace(toId) {
    const result = traceConnection(forensicCase, traceFromId, toId)
    setTraceFromId(null)

    if (!result.ok) {
      setNotice(result.reason)
      return
    }

    const already = traced.some((link) => link.key === result.link.key)
    setNotice(
      already
        ? 'Already traced — they share ' + result.via.join(', ') + '.'
        : 'Connection traced. Shared: ' + result.via.join(', ') + '.'
    )
    if (!already) setTraced((current) => [...current, result.link])
    setSelectedId(toId)
  }

  function toggleFlag(indicator) {
    setFlagged((current) =>
      current.includes(indicator)
        ? current.filter((value) => value !== indicator)
        : [...current, indicator]
    )
  }

  function submit(optionId) {
    const result = checkConclusion(forensicCase, optionId)
    if (!result.ok) return

    setVerdict(result)
    onCaseClosed?.({
      caseId: forensicCase.caseId,
      correct: result.correct,
      chainComplete: score.chainComplete,
    })
  }

  function nextCase() {
    const nextSeen = [...seenIds, forensicCase.id]
    setSeenIds(nextSeen)
    setForensicCase(pickForensicCase(FORENSIC_CASES, nextSeen))
    setSelectedId(null)
    setTraceFromId(null)
    setTraced([])
    setFlagged([])
    setVerdict(null)
    setNotice('')
  }

  const tracing = traceFromId !== null

  return (
    <div className="forensics">
      <p className="forensics__live" role="status" aria-live="polite">
        {notice}
      </p>

      <header className="forensics__head">
        <p className="forensics__case-id">
          {forensicCase.caseId} · {forensicCase.severity.toUpperCase()}
        </p>
        <h3 className="forensics__title">{forensicCase.title}</h3>
        <p className="forensics__brief">{forensicCase.brief}</p>
      </header>

      <div className="forensics__progress">
        <span>
          Chain: <strong>{score.onChain}</strong> of {score.chainTotal} connections traced
        </span>
        <span>
          Indicators flagged: <strong>{score.correctFlags}</strong> of {score.indicatorsTotal}
        </span>
        {score.supportedOffChain > 0 && (
          <span>{score.supportedOffChain} further supported connection{score.supportedOffChain === 1 ? '' : 's'}</span>
        )}
      </div>

      <div className="forensics__layout">
        <div className="forensics__board cv-grid cv-live">
          {/* Decoration only: every traced connection is also written out
              in the list below, so nothing here is load-bearing. */}
          <svg
            className="forensics__links"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {traced.map((link) => {
              const from = findArtifact(forensicCase.artifacts, link.from)
              const to = findArtifact(forensicCase.artifacts, link.to)
              if (!from || !to) return null

              return (
                <line
                  key={link.key}
                  className="forensics__link"
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                />
              )
            })}
          </svg>

          <ul className="forensics__nodes">
            {forensicCase.artifacts.map((artifact) => {
              const isSelected = artifact.id === selectedId
              const isSource = artifact.id === traceFromId
              const connected = traced.some(
                (link) => link.from === artifact.id || link.to === artifact.id
              )

              return (
                <li
                  key={artifact.id}
                  className="forensics__node-slot"
                  style={{ '--node-x': `${artifact.x}%`, '--node-y': `${artifact.y}%` }}
                >
                  <button
                    type="button"
                    data-cursor={tracing ? 'action' : 'inspect'}
                    className={`forensics__node ${isSelected ? 'forensics__node--selected' : ''} ${
                      isSource ? 'forensics__node--source' : ''
                    } ${connected ? 'forensics__node--linked' : ''}`}
                    aria-pressed={isSelected}
                    onClick={() => (tracing ? completeTrace(artifact.id) : inspect(artifact.id))}
                  >
                    <span className="forensics__node-kind">{KIND_LABEL[artifact.kind]}</span>
                    <span className="forensics__node-label">{artifact.label}</span>
                    <span className="forensics__node-time">{artifact.at}</span>
                    {connected && <span className="forensics__node-state">traced</span>}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>

        <aside className="forensics__inspector cv-panel" aria-label="Evidence inspector">
          {!selected ? (
            <p className="forensics__empty">
              Select a record to inspect it. Two records can be traced to each other
              only when they share an address, account, object or hash.
            </p>
          ) : (
            <>
              <p className="forensics__inspector-kind">{KIND_LABEL[selected.kind]} · {selected.at}</p>
              <h4 className="forensics__inspector-title">{selected.label}</h4>
              <p className="forensics__inspector-detail">{selected.detail}</p>

              <dl className="forensics__fields">
                {selected.fields.map(([key, value]) => (
                  <div key={key} className="forensics__field">
                    <dt>{key}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>

              <button
                type="button"
                className="forensics__action"
                data-cursor="action"
                onClick={startTrace}
                disabled={tracing}
              >
                {tracing ? 'Choose a record to trace to' : 'Trace connection'}
              </button>
              {tracing && (
                <button
                  type="button"
                  className="forensics__action forensics__action--quiet"
                  onClick={() => {
                    setTraceFromId(null)
                    setNotice('Trace cancelled.')
                  }}
                >
                  Cancel trace
                </button>
              )}
            </>
          )}
        </aside>
      </div>

      <section className="forensics__findings" aria-labelledby="forensics-traced-heading">
        <h4 id="forensics-traced-heading" className="forensics__findings-title">
          Traced connections
        </h4>
        {traced.length === 0 ? (
          <p className="forensics__empty">Nothing traced yet.</p>
        ) : (
          <ul className="forensics__traced">
            {traced.map((link) => (
              <li key={link.key} className="forensics__traced-item">
                <span className="forensics__traced-pair">
                  {findArtifact(forensicCase.artifacts, link.from).label} ↔{' '}
                  {findArtifact(forensicCase.artifacts, link.to).label}
                </span>
                <span className="forensics__traced-via">shares {link.via.join(', ')}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {revealedIndicators.length > 0 && (
        <section className="forensics__indicators" aria-labelledby="forensics-indicators-heading">
          <h4 id="forensics-indicators-heading" className="forensics__findings-title">
            Indicators found
          </h4>
          <p className="forensics__hint">
            Flag the ones that carry the incident. Flagging is reversible.
          </p>
          <ul className="forensics__indicator-list">
            {revealedIndicators.map((indicator) => (
              <li key={indicator}>
                <button
                  type="button"
                  className={`forensics__indicator ${
                    flagged.includes(indicator) ? 'forensics__indicator--flagged' : ''
                  }`}
                  aria-pressed={flagged.includes(indicator)}
                  onClick={() => toggleFlag(indicator)}
                >
                  <span className="forensics__indicator-value">{indicator}</span>
                  <span className="forensics__indicator-state">
                    {flagged.includes(indicator) ? 'FLAGGED' : 'flag'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="forensics__conclusion" aria-labelledby="forensics-conclusion-heading">
        <h4 id="forensics-conclusion-heading" className="forensics__findings-title">
          Conclusion
        </h4>

        {!verdict ? (
          <>
            <p className="forensics__hint">
              {score.chainComplete
                ? 'The chain is complete. Name what happened.'
                : 'You can submit at any point — the evidence you have traced is what your conclusion rests on.'}
            </p>
            <ul className="forensics__options">
              {forensicCase.conclusionOptions.map((option) => (
                <li key={option.id}>
                  <button
                    type="button"
                    className="forensics__option"
                    data-cursor="action"
                    onClick={() => submit(option.id)}
                  >
                    {option.label}
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <div
            className={`forensics__verdict forensics__verdict--${verdict.correct ? 'correct' : 'wrong'}`}
          >
            <p className="forensics__verdict-line">
              {verdict.correct ? 'Supported by the evidence' : 'Not supported by the evidence'}
            </p>
            <p className="forensics__verdict-explanation">{verdict.explanation}</p>

            {!verdict.correct && (
              <p className="forensics__verdict-explanation">
                <strong>{correctConclusion(forensicCase).label}.</strong>{' '}
                {correctConclusion(forensicCase).explanation}
              </p>
            )}

            <p className="forensics__verdict-explanation">
              You traced {score.onChain} of {score.chainTotal} chain connections
              {score.missing.length > 0
                ? ` and left ${score.missing.length} untraced.`
                : ' — the whole chain.'}
            </p>

            <button type="button" className="forensics__action" onClick={nextCase}>
              Next case file
            </button>
          </div>
        )}
      </section>
    </div>
  )
}
