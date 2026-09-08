/**
 * The Cyber District's sectors.
 *
 * Content, not logic: this file says what exists and how it is described.
 * Whether a sector can be opened right now is decided in
 * game/cyberNavigation.js from live progress, so the catalogue stays a
 * flat list that reads like a table of contents.
 *
 * `availability` is what this build actually ships:
 *   'open'      -- built and reachable
 *   'gated'     -- built, but earns its way in through `requires`
 *   'planned'   -- named here, not built yet, and honestly labelled so
 *
 * Nothing here is a real security product, technique or telemetry
 * source. CLOUDVERSE is a fictional simulation.
 */

export const SECTOR_AVAILABILITY = {
  OPEN: 'open',
  GATED: 'gated',
  PLANNED: 'planned',
}

export const CYBER_SECTORS = Object.freeze([
  Object.freeze({
    id: 'operations',
    code: 'SEC-01',
    label: 'Cyber Operations',
    tagline: 'Threat monitor, defenses, missions',
    summary:
      'The command surface: live threats, the firewall rules protecting the district, and the mission chain that unlocks the rest of it.',
    availability: SECTOR_AVAILABILITY.OPEN,
  }),
  Object.freeze({
    id: 'incident-response',
    code: 'SEC-02',
    label: 'Incident Response',
    tagline: 'Long-form investigation',
    summary:
      'A case opens, evidence is read in order, a root cause is named, and containment is chosen knowing what it costs.',
    availability: SECTOR_AVAILABILITY.GATED,
    requires: {
      missionId: 'first-response',
      reason: 'Answer one threat correctly in Cyber Operations to open a case file.',
    },
  }),
  Object.freeze({
    id: 'analytics',
    code: 'SEC-03',
    label: 'Security Analytics',
    tagline: 'Everything, derived from the log',
    summary:
      'Accuracy by severity, world health and score over the run, how investigations ended — all computed from the security event log rather than stored as totals.',
    availability: SECTOR_AVAILABILITY.OPEN,
  }),
  Object.freeze({
    id: 'forensics',
    code: 'SEC-04',
    label: 'Digital Forensics',
    tagline: 'Evidence board and attack chains',
    summary:
      'Artefacts with real metadata — hashes, addresses, accounts, paths — and connections you find by noticing what two records have in common, rather than being handed a diagram.',
    availability: SECTOR_AVAILABILITY.OPEN,
  }),
  Object.freeze({
    id: 'network',
    code: 'SEC-05',
    label: 'Network Operations',
    tagline: 'Nodes, traffic, packet inspection',
    summary:
      'A live network view where traffic can be inspected and malicious flows blocked, feeding the threat engine directly.',
    availability: SECTOR_AVAILABILITY.PLANNED,
  }),
  Object.freeze({
    id: 'intelligence',
    code: 'SEC-06',
    label: 'Security Intelligence',
    tagline: 'Indicators, actors, campaigns',
    summary:
      'Correlating an indicator to an actor to a campaign to an incident already closed in this district.',
    availability: SECTOR_AVAILABILITY.PLANNED,
  }),
  Object.freeze({
    id: 'lab',
    code: 'SEC-07',
    label: 'Security Lab',
    tagline: 'Configuration sandbox',
    summary:
      'Change detection sensitivity, segmentation or authentication strength and watch the simulation respond.',
    availability: SECTOR_AVAILABILITY.PLANNED,
  }),
  Object.freeze({
    id: 'academy',
    code: 'SEC-08',
    label: 'Cyber Academy',
    tagline: 'Scenario-based micro-lessons',
    summary:
      'Short scenarios with a decision and an explanation, rather than pages of text.',
    availability: SECTOR_AVAILABILITY.PLANNED,
  }),
  Object.freeze({
    id: 'arcade',
    code: 'SEC-09',
    label: 'Cyber Arcade',
    tagline: 'The side experience',
    summary:
      'Packet Snake, Firewall Reflex and Code Breaker — lighter games whose results feed back into the same progress the district uses.',
    availability: SECTOR_AVAILABILITY.PLANNED,
  }),
])

export const DEFAULT_SECTOR_ID = 'operations'
