/**
 * The district's network topology.
 *
 * Unlike the forensic case files -- where connections are derived from
 * shared indicators and never authored -- a network's links *are* a
 * real, authored thing. Which host talks to which is a fact about how
 * the network was built, not something to be inferred from traffic.
 *
 * `x` and `y` are percentages of the map, and are layout only: below the
 * board breakpoint the map is not drawn at all and the same nodes read
 * as a list.
 *
 * Every host, address and service here is invented. Addresses come from
 * the ranges reserved for documentation (RFC 5737), so nothing can point
 * at a real machine even by accident.
 */

export const NODE_KIND = {
  CLIENT: 'client',
  GATEWAY: 'gateway',
  FIREWALL: 'firewall',
  SERVER: 'server',
  DATABASE: 'database',
  COLLECTOR: 'collector',
}

export const NETWORK_NODES = Object.freeze([
  Object.freeze({
    id: 'client-a',
    kind: NODE_KIND.CLIENT,
    label: 'Workstation A',
    address: '192.0.2.41',
    role: 'Analyst workstation on the internal segment.',
    x: 8,
    y: 20,
  }),
  Object.freeze({
    id: 'client-b',
    kind: NODE_KIND.CLIENT,
    label: 'Workstation B',
    address: '192.0.2.42',
    role: 'Second analyst workstation, same segment.',
    x: 8,
    y: 66,
  }),
  Object.freeze({
    id: 'gateway',
    kind: NODE_KIND.GATEWAY,
    label: 'Edge Gateway',
    address: '192.0.2.1',
    role: 'Everything entering or leaving the district passes through here.',
    x: 34,
    y: 43,
  }),
  Object.freeze({
    id: 'firewall',
    kind: NODE_KIND.FIREWALL,
    label: 'Perimeter Firewall',
    address: '192.0.2.2',
    role: 'Where the defense rules in Cyber Operations are applied.',
    x: 60,
    y: 43,
  }),
  Object.freeze({
    id: 'app-server',
    kind: NODE_KIND.SERVER,
    label: 'App Server',
    address: '192.0.2.80',
    role: 'Serves the district application.',
    x: 88,
    y: 12,
  }),
  Object.freeze({
    id: 'db-primary',
    kind: NODE_KIND.DATABASE,
    label: 'Database Primary',
    address: '192.0.2.90',
    role: 'Holds the district records. Reachable only from the app server.',
    x: 88,
    y: 45,
  }),
  Object.freeze({
    id: 'log-collector',
    kind: NODE_KIND.COLLECTOR,
    label: 'Log Collector',
    address: '192.0.2.95',
    role: 'Receives the telemetry the other sectors read.',
    x: 88,
    y: 80,
  }),
])

export const NETWORK_LINKS = Object.freeze([
  Object.freeze({ from: 'client-a', to: 'gateway' }),
  Object.freeze({ from: 'client-b', to: 'gateway' }),
  Object.freeze({ from: 'gateway', to: 'firewall' }),
  Object.freeze({ from: 'firewall', to: 'app-server' }),
  Object.freeze({ from: 'firewall', to: 'db-primary' }),
  Object.freeze({ from: 'app-server', to: 'db-primary' }),
  Object.freeze({ from: 'app-server', to: 'log-collector' }),
])

/**
 * Traffic patterns.
 *
 * `malicious: false` entries are ordinary traffic. Some of them carry a
 * `looksOdd` note -- traffic that is unusual and entirely legitimate --
 * because a queue where everything suspicious turns out to be malicious
 * teaches the wrong lesson: it teaches that blocking is free.
 */
export const TRAFFIC_PATTERNS = Object.freeze([
  Object.freeze({
    id: 'app-db-read',
    from: 'app-server',
    to: 'db-primary',
    protocol: 'TCP',
    port: 5432,
    summary: 'Application reading district records',
    malicious: false,
    signals: Object.freeze(['Expected path: app server to database', 'Volume within the usual range']),
  }),
  Object.freeze({
    id: 'client-app',
    from: 'client-a',
    to: 'app-server',
    protocol: 'TCP',
    port: 443,
    summary: 'Analyst opening the district application',
    malicious: false,
    signals: Object.freeze(['Internal address', 'Ordinary session length']),
  }),
  Object.freeze({
    id: 'telemetry',
    from: 'app-server',
    to: 'log-collector',
    protocol: 'TCP',
    port: 9200,
    summary: 'Telemetry batch to the collector',
    malicious: false,
    signals: Object.freeze(['Runs on a schedule', 'Same size every hour']),
  }),
  Object.freeze({
    id: 'backup-window',
    from: 'db-primary',
    to: 'log-collector',
    protocol: 'TCP',
    port: 9200,
    summary: 'Backup verification report, larger than usual',
    malicious: false,
    looksOdd: 'Six times the usual size, and outside the normal window.',
    signals: Object.freeze([
      'Unusual size for this pair',
      'Outside the normal window',
      'Runs under the scheduled backup account',
      'Destination is the collector, not an external address',
    ]),
  }),
  Object.freeze({
    id: 'db-direct',
    from: 'client-b',
    to: 'db-primary',
    protocol: 'TCP',
    port: 5432,
    summary: 'Workstation connecting straight to the database',
    malicious: true,
    signals: Object.freeze([
      'Path the topology does not contain',
      'Database is meant to be reachable only from the app server',
      'Credentials belong to a service account, not to this workstation',
    ]),
  }),
  Object.freeze({
    id: 'egress-unknown',
    from: 'app-server',
    to: 'gateway',
    protocol: 'TCP',
    port: 8443,
    summary: 'Outbound session to 203.0.113.77',
    malicious: true,
    signals: Object.freeze([
      'Destination never contacted before',
      'Started outside any deployment window',
      'Bytes out far exceed bytes in',
    ]),
  }),
  Object.freeze({
    id: 'sweep',
    from: 'gateway',
    to: 'firewall',
    protocol: 'TCP',
    port: 0,
    summary: 'Sequential connection attempts across many ports',
    malicious: true,
    signals: Object.freeze([
      '1,400 attempts in 40 seconds',
      'Ports tried in numeric order',
      'All from one source address, 198.51.100.23',
    ]),
  }),
])
