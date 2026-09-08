/**
 * Forensic correlation rules.
 *
 * The one idea here: **a connection between two artefacts is not
 * authored, it is derived from what they have in common.** Two records
 * are linked when they share an indicator -- the same address, the same
 * account, the same hash, the same object. Nothing in data/ lists the
 * edges, so the picture on the board cannot disagree with the evidence
 * behind it, and a case author cannot accidentally draw a link the data
 * does not support.
 *
 * That is also the skill the exercise is practising. A responder does
 * not receive a diagram; they receive records, and the diagram is what
 * they build by noticing that two of them mention the same address.
 *
 * Pure module: no DOM, no JSX, no storage. Every case, host, address and
 * hash is fictional.
 */

/** Every indicator on an artefact, tolerating one that has none. */
export function indicatorsOf(artifact) {
  return Array.isArray(artifact?.indicators) ? artifact.indicators : []
}

/**
 * What two artefacts have in common.
 *
 * Returns the shared indicators rather than a boolean, because "these
 * are connected" is not useful on its own -- the answer a responder
 * needs is *what* connects them.
 */
export function sharedIndicators(a, b) {
  if (!a || !b || a.id === b.id) return []
  const second = new Set(indicatorsOf(b))
  return indicatorsOf(a).filter((indicator) => second.has(indicator))
}

/** True when a trace between two artefacts is supported by the evidence. */
export function areConnected(a, b) {
  return sharedIndicators(a, b).length > 0
}

/** An artefact by id, or null. */
export function findArtifact(artifacts = [], id) {
  return artifacts.find((artifact) => artifact.id === id) ?? null
}

/**
 * Every supported connection in a case, each listed once.
 *
 * Pairs are ordered by their position in the array and the second index
 * always starts after the first, so A-B and B-A cannot both appear.
 */
export function allLinks(artifacts = []) {
  const links = []

  for (let i = 0; i < artifacts.length; i += 1) {
    for (let j = i + 1; j < artifacts.length; j += 1) {
      const via = sharedIndicators(artifacts[i], artifacts[j])
      if (via.length > 0) links.push({ from: artifacts[i].id, to: artifacts[j].id, via })
    }
  }

  return links
}

/** The artefacts one artefact shares anything with. */
export function neighbours(artifacts = [], id) {
  const subject = findArtifact(artifacts, id)
  if (!subject) return []

  return artifacts.filter((artifact) => areConnected(subject, artifact))
}

/** A stable key for a pair, so a link is the same however it was drawn. */
export function linkKey(a, b) {
  return [a, b].sort().join('~')
}

/**
 * The links that lie along the case's true attack chain.
 *
 * The chain is an ordered list of artefact ids, so its links are the
 * consecutive pairs. A chain step whose two artefacts share nothing
 * would be a fault in the case data, and is dropped rather than
 * demanded of the player.
 */
export function chainLinks(forensicCase) {
  const chain = forensicCase?.chain ?? []
  const links = []

  for (let i = 0; i < chain.length - 1; i += 1) {
    const a = findArtifact(forensicCase.artifacts, chain[i])
    const b = findArtifact(forensicCase.artifacts, chain[i + 1])
    if (areConnected(a, b)) links.push(linkKey(chain[i], chain[i + 1]))
  }

  return links
}

/**
 * Attempting a trace between two artefacts.
 *
 * A trace that is not supported is refused with the reason, not
 * silently ignored: "these two share nothing" is the finding.
 */
export function traceConnection(forensicCase, fromId, toId) {
  const from = findArtifact(forensicCase?.artifacts, fromId)
  const to = findArtifact(forensicCase?.artifacts, toId)

  if (!from || !to) return { ok: false, reason: 'That record is not in this case file.' }
  if (from.id === to.id) return { ok: false, reason: 'A record cannot be traced to itself.' }

  const via = sharedIndicators(from, to)
  if (via.length === 0) {
    return {
      ok: false,
      reason: `${from.label} and ${to.label} share no address, account, object or hash. That is a finding in itself.`,
    }
  }

  return { ok: true, link: { key: linkKey(from.id, to.id), from: from.id, to: to.id, via }, via }
}

/**
 * How the investigation stands.
 *
 * `onChain` counts only traces along the true chain. `supported` counts
 * every trace the evidence backs, chain or not -- a real connection off
 * the chain is a legitimate observation, not a mistake, so it is
 * reported separately rather than penalised.
 */
export function scoreInvestigation(forensicCase, tracedKeys = [], flaggedIndicators = []) {
  const chain = chainLinks(forensicCase)
  const supportedKeys = allLinks(forensicCase?.artifacts ?? []).map((link) =>
    linkKey(link.from, link.to)
  )

  const traced = [...new Set(tracedKeys)]
  const onChain = traced.filter((key) => chain.includes(key))
  const missing = chain.filter((key) => !traced.includes(key))
  const supportedOffChain = traced.filter(
    (key) => supportedKeys.includes(key) && !chain.includes(key)
  )

  const key = forensicCase?.keyIndicators ?? []
  const flagged = [...new Set(flaggedIndicators)]
  const correctFlags = flagged.filter((indicator) => key.includes(indicator))
  const missedFlags = key.filter((indicator) => !flagged.includes(indicator))

  return {
    chainTotal: chain.length,
    onChain: onChain.length,
    missing,
    supportedOffChain: supportedOffChain.length,
    chainComplete: chain.length > 0 && missing.length === 0,
    indicatorsTotal: key.length,
    correctFlags: correctFlags.length,
    missedFlags,
    noiseFlags: flagged.filter((indicator) => !key.includes(indicator)).length,
    indicatorsComplete: key.length > 0 && missedFlags.length === 0,
  }
}

/** Whether a submitted conclusion is the supported one, plus the reason. */
export function checkConclusion(forensicCase, optionId) {
  const option = forensicCase?.conclusionOptions?.find((candidate) => candidate.id === optionId)
  if (!option) return { ok: false, reason: 'That conclusion is not on the list.' }

  return {
    ok: true,
    correct: option.correct === true,
    option,
    explanation: option.explanation,
  }
}

/** The supported conclusion, for showing after a wrong one. */
export function correctConclusion(forensicCase) {
  return forensicCase?.conclusionOptions?.find((option) => option.correct === true) ?? null
}

/**
 * The next case to work.
 *
 * Cases already seen are skipped; once they all have been, it starts
 * again rather than leaving the sector with nothing to open.
 */
export function pickForensicCase(cases = [], seenIds = []) {
  if (cases.length === 0) return null
  return cases.find((forensicCase) => !seenIds.includes(forensicCase.id)) ?? cases[0]
}
