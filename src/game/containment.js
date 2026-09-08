/**
 * Containment actions and their consequences.
 *
 * The idea this layer exists to teach: a containment decision is a
 * trade. Isolating a server ends the exposure and also takes the service
 * off the air. Pausing the pipeline stops a bad artifact spreading and
 * also stops every good release behind it. An action that only ever
 * helped would not be a decision, it would be a button.
 *
 * So every action here carries both a security effect and an operational
 * cost, and the "best" choice depends on what is actually happening —
 * which is why the case decides which actions are appropriate rather
 * than this file ranking them once and for all.
 *
 * Effects are returned as plain data rather than applied here. The Cloud
 * and DevOps districts do not expose shared state yet, so nothing can
 * consume an availability change today; emitting it as data means the
 * rule is already correct and can be wired up when those districts grow
 * a state layer, without this engine changing.
 *
 * Framework-free. Fictional simulation only (spec 52).
 */

/**
 * The containment options available to the player.
 *
 * `risk` is the change to current exposure — negative reduces it.
 * `cloudAvailability` and `pipelineStatus` are the operational cost,
 * expressed the same way, for whoever consumes them later.
 */
export const CONTAINMENT_ACTIONS = [
  {
    id: 'isolate-server',
    label: 'Isolate the affected server',
    description: 'Cuts the host off the network so nothing more can reach or leave it.',
    effects: { risk: -25, cloudAvailability: -30, pipelineStatus: 'unchanged' },
    tradeOff: 'Exposure drops sharply, but the service on that host goes offline with it.',
  },
  {
    id: 'disable-account',
    label: 'Disable the compromised account',
    description: 'Suspends the account being used, ending its access immediately.',
    effects: { risk: -20, cloudAvailability: -5, pipelineStatus: 'unchanged' },
    tradeOff: 'Cheap operationally — unless the account is one a running job depends on.',
  },
  {
    id: 'block-endpoint',
    label: 'Block the outbound endpoint',
    description: 'Stops traffic to the address the incident is reaching.',
    effects: { risk: -15, cloudAvailability: 0, pipelineStatus: 'unchanged' },
    tradeOff: 'No operational cost, but it treats the symptom rather than the access itself.',
  },
  {
    id: 'pause-deployment',
    label: 'Pause the deployment pipeline',
    description: 'Halts releases so a suspect artifact cannot travel any further.',
    effects: { risk: -20, cloudAvailability: 0, pipelineStatus: 'blocked' },
    tradeOff: 'Stops the spread, and stops every unrelated release queued behind it.',
  },
  {
    id: 'raise-defenses',
    label: 'Raise additional firewall defenses',
    description: 'Tightens filtering rules around the affected system.',
    effects: { risk: -10, cloudAvailability: -5, pipelineStatus: 'unchanged' },
    tradeOff: 'Low cost and low benefit — useful alongside a real containment, not instead of one.',
  },
]

export function findContainmentAction(actionId) {
  return CONTAINMENT_ACTIONS.find((a) => a.id === actionId) ?? null
}

/**
 * Which actions actually address a given case.
 *
 * Appropriateness is a property of the incident, not of the action: an
 * account suspension is the right move for stolen credentials and beside
 * the point for a tampered build artifact.
 */
const APPROPRIATE_BY_CASE = {
  'login-burst': ['disable-account', 'isolate-server'],
  'deployment-artifact': ['pause-deployment', 'isolate-server'],
  'database-access': ['disable-account', 'block-endpoint'],
}

export function appropriateActions(caseKey) {
  return APPROPRIATE_BY_CASE[caseKey] ?? []
}

/**
 * Applies a containment choice.
 *
 * An inappropriate action is not rejected — it is allowed, and it costs
 * what it costs. Learning that isolating a build server does nothing for
 * stolen credentials is the point, and refusing the click would remove
 * the lesson. What it does not do is reduce risk as much, because it did
 * not address the actual access.
 */
export function applyContainment(caseKey, actionId) {
  const action = findContainmentAction(actionId)
  if (!action) {
    return { ok: false, reason: `Unknown containment action "${actionId}".`, effects: null }
  }

  const appropriate = appropriateActions(caseKey).includes(actionId)

  // An action aimed at the wrong thing still costs its operational price
  // but only partially reduces exposure -- it did not close the way in.
  const risk = appropriate ? action.effects.risk : Math.round(action.effects.risk * 0.25)

  return {
    ok: true,
    reason: null,
    appropriate,
    action,
    effects: { ...action.effects, risk },
    tradeOff: action.tradeOff,
  }
}

/** Total effect of a sequence of containment choices, for the post-mortem. */
export function summariseContainment(caseKey, actionIds) {
  const applied = actionIds.map((id) => applyContainment(caseKey, id)).filter((r) => r.ok)

  return {
    actions: applied,
    riskChange: applied.reduce((sum, r) => sum + r.effects.risk, 0),
    availabilityChange: applied.reduce((sum, r) => sum + r.effects.cloudAvailability, 0),
    pipelineBlocked: applied.some((r) => r.effects.pipelineStatus === 'blocked'),
    anyAppropriate: applied.some((r) => r.appropriate),
  }
}
