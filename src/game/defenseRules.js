/**
 * Defense rule catalogue.
 *
 * A fixed set of four toggleable rules, one loosely aligned with each
 * threat type in threatTypes.js -- not wired together mechanically yet,
 * but named so a future phase can connect them (e.g. Rate Limiting
 * being off could bias threat generation toward Traffic Flood).
 *
 * Everything here is fictional simulation, not a real firewall
 * configuration -- see spec 52.
 */

export const DEFENSE_RULES = [
  {
    id: 'block-unauthorized-ips',
    label: 'Block Unauthorized IPs',
    description: 'Blocks connections from IP addresses flagged for suspicious login attempts.',
  },
  {
    id: 'rate-limiting',
    label: 'Rate Limiting',
    description: 'Caps how many requests a single source can send in a short window.',
  },
  {
    id: 'payload-quarantine',
    label: 'Payload Quarantine',
    description: 'Isolates uploaded files that match known-malicious signatures before they run.',
  },
  {
    id: 'service-watchdog',
    label: 'Service Watchdog',
    description: 'Automatically restarts a core service if it stops responding.',
  },
]
