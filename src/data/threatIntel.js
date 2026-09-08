/**
 * Threat intelligence.
 *
 * The important detail is not the content, it is the *keys*. Indicators
 * here are written in exactly the format the forensic case files and the
 * network patterns already use -- `ip:198.51.100.23`,
 * `account:svc-deploy`, `token:tok_7Q`. That is what lets an indicator
 * the player flagged during their own investigation correlate through to
 * an actor and a campaign, instead of this sector being a separate
 * encyclopaedia nobody's play ever touches.
 *
 * Everything below is invented for CLOUDVERSE. The actors are fictional,
 * the campaigns never happened, and the patterns are described in
 * general terms rather than as procedures anyone could follow. Addresses
 * come from the ranges reserved for documentation (RFC 5737).
 */

/**
 * Attack patterns, described as *shapes* rather than instructions.
 *
 * A responder needs to recognise the shape of what is happening. They do
 * not need, and this file does not contain, the steps to reproduce it.
 */
export const ATTACK_PATTERNS = Object.freeze([
  Object.freeze({
    id: 'artifact-substitution',
    name: 'Artifact substitution',
    summary:
      'Something that was already trusted is swapped after it was checked and before it was used. The pipeline behaves correctly throughout; the thing it was told to deploy is simply not the thing that was built.',
    tell: 'A checksum that differs between where a thing was produced and where it was consumed.',
  }),
  Object.freeze({
    id: 'credential-relocation',
    name: 'Credential relocation',
    summary:
      'A credential is used from somewhere it was never meant to be used from. The account is legitimate and the permissions are real, which is what makes it hard to see.',
    tell: 'One identity active from two places at once, or from a range it has never used before.',
  }),
  Object.freeze({
    id: 'boundary-probing',
    name: 'Boundary probing',
    summary:
      'A methodical search for a way in, rather than an attempt to use one. Most of it fails, and the failures are the signal.',
    tell: 'A high volume of attempts in a short window, ordered rather than random.',
  }),
  Object.freeze({
    id: 'quiet-exfiltration',
    name: 'Quiet exfiltration',
    summary:
      'Data leaving by a route that is allowed to exist, in volumes that are not. Nothing is broken into; something is simply carried out.',
    tell: 'Outbound volume far exceeding inbound on a connection with no history.',
  }),
  Object.freeze({
    id: 'service-account-drift',
    name: 'Service account drift',
    summary:
      'An automation account gradually used for things it was never provisioned for, until an unusual action by it stops looking unusual.',
    tell: 'A non-human account performing an action outside its normal set.',
  }),
])

export const THREAT_ACTORS = Object.freeze([
  Object.freeze({
    id: 'pale-ledger',
    codename: 'PALE LEDGER',
    summary:
      'Patient and quiet. Prefers to alter something already trusted rather than break in, and leaves the surrounding systems working so nothing raises an alarm on its own.',
    motivation: 'Persistent access to build and release infrastructure.',
    firstSeen: 'Sector telemetry, eight months ago',
    patternIds: Object.freeze(['artifact-substitution', 'service-account-drift', 'quiet-exfiltration']),
    indicators: Object.freeze([
      'ip:198.51.100.23',
      'account:svc-deploy',
      'hash:3d80be51fa17',
    ]),
  }),
  Object.freeze({
    id: 'glass-meridian',
    codename: 'GLASS MERIDIAN',
    summary:
      'Opportunistic. Collects credentials wherever they are exposed and uses them from its own infrastructure, usually within minutes and usually for bulk reads.',
    motivation: 'Bulk collection of district records.',
    firstSeen: 'Sector telemetry, three months ago',
    patternIds: Object.freeze(['credential-relocation', 'quiet-exfiltration']),
    indicators: Object.freeze(['ip:203.0.113.77', 'token:tok_7Q']),
  }),
  Object.freeze({
    id: 'iron-tide',
    codename: 'IRON TIDE',
    summary:
      'Loud and untargeted. Sweeps whatever it can reach and moves on. Rarely the cause of an incident on its own, and frequently mistaken for one.',
    motivation: 'Indiscriminate discovery.',
    firstSeen: 'Sector telemetry, continuously',
    patternIds: Object.freeze(['boundary-probing']),
    indicators: Object.freeze(['ip:198.51.100.90']),
  }),
])

export const CAMPAIGNS = Object.freeze([
  Object.freeze({
    id: 'stillwater',
    name: 'STILLWATER',
    actorId: 'pale-ledger',
    window: 'Ongoing',
    summary:
      'A sustained interest in the district release pipeline. Each observed step is small and individually defensible; the pattern only appears when they are put in order.',
    indicators: Object.freeze(['ip:198.51.100.23', 'account:svc-deploy', 'hash:3d80be51fa17']),
    relatedCaseIds: Object.freeze(['DF-001']),
  }),
  Object.freeze({
    id: 'openwindow',
    name: 'OPEN WINDOW',
    actorId: 'glass-meridian',
    window: 'Last six weeks',
    summary:
      'Reporting credentials appearing outside the ranges they are bound to, followed within a minute by an export far larger than the endpoint normally serves.',
    indicators: Object.freeze(['ip:203.0.113.77', 'token:tok_7Q']),
    relatedCaseIds: Object.freeze(['DF-002']),
  }),
  Object.freeze({
    id: 'shoreline',
    name: 'SHORELINE',
    actorId: 'iron-tide',
    window: 'Continuous background',
    summary:
      'Ordinary internet background noise against the district perimeter. Recorded so that it can be recognised and set aside, not so that it can be chased.',
    indicators: Object.freeze(['ip:198.51.100.90']),
    relatedCaseIds: Object.freeze([]),
  }),
])

/** Every indicator this sector knows anything about, de-duplicated. */
export const KNOWN_INDICATORS = Object.freeze([
  ...new Set([
    ...THREAT_ACTORS.flatMap((actor) => actor.indicators),
    ...CAMPAIGNS.flatMap((campaign) => campaign.indicators),
  ]),
])
