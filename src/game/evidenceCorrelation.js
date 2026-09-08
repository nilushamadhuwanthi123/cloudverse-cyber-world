/**
 * Evidence correlation and root cause checking.
 *
 * The point of this layer is that forensics should not reduce to
 * "click the highlighted item". An analyst reads several records, puts
 * them in order, notices they belong to the same chain, and only then
 * can say what happened. So the engine scores a *selection* of evidence
 * rather than a single answer, and the timeline is what makes the chain
 * visible.
 *
 * Framework-free, like the rest of game/ — plain functions over the case
 * data in data/incidentCases.js. Everything it reads is fictional
 * simulation content (spec 52).
 */

/** Evidence ordered as it happened, which is how a chain becomes readable. */
export function buildTimeline(evidence) {
  return [...evidence].sort((a, b) => a.atMinute - b.atMinute)
}

/**
 * Evidence that belongs to the same chain as the given item.
 *
 * Records with no correlation id belong to no chain — they are the
 * ordinary background noise of a running system, and treating them as
 * related to everything would defeat the exercise.
 */
export function relatedEvidence(evidence, correlationId) {
  if (!correlationId) return []
  return buildTimeline(evidence.filter((item) => item.correlationId === correlationId))
}

/** Every distinct chain present in a case's evidence. */
export function chainsIn(evidence) {
  const ids = new Set(evidence.map((item) => item.correlationId).filter(Boolean))
  return [...ids].map((id) => ({ correlationId: id, evidence: relatedEvidence(evidence, id) }))
}

/**
 * Scores what the player selected against what actually mattered.
 *
 * Reported as three separate counts rather than one percentage, because
 * missing a real clue and dragging in an irrelevant one are different
 * mistakes and deserve different feedback:
 *
 *   found    relevant evidence correctly selected
 *   missed   relevant evidence left behind
 *   noise    irrelevant evidence selected
 *
 * `complete` means every relevant record was found and nothing else was,
 * which is the standard the root-cause step is worth attempting from.
 */
export function scoreSelection(evidence, selectedIds) {
  const selected = new Set(selectedIds)

  const relevant = evidence.filter((item) => item.relevant)
  const found = relevant.filter((item) => selected.has(item.id))
  const missed = relevant.filter((item) => !selected.has(item.id))
  const noise = evidence.filter((item) => !item.relevant && selected.has(item.id))

  return {
    found,
    missed,
    noise,
    complete: missed.length === 0 && noise.length === 0,
    accuracy: relevant.length === 0 ? 0 : found.length / relevant.length,
  }
}

/**
 * Checks a root cause answer.
 *
 * Always returns the explanation, right or wrong. A wrong answer that
 * only says "wrong" teaches nothing, and the explanations are written to
 * say why the evidence does not support that reading — which is the
 * actual skill being practised.
 */
export function checkRootCause(incidentCase, optionId) {
  const option = incidentCase.rootCauseOptions.find((o) => o.id === optionId)
  if (!option) {
    return { ok: false, correct: false, explanation: null, reason: `Unknown option "${optionId}".` }
  }

  return {
    ok: true,
    correct: option.correct,
    explanation: option.explanation,
    reason: null,
  }
}

/** The correct root cause for a case, for the replay and post-mortem. */
export function correctRootCause(incidentCase) {
  return incidentCase.rootCauseOptions.find((o) => o.correct) ?? null
}
