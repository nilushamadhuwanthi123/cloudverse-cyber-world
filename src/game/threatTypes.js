/**
 * Threat type catalogue.
 *
 * Design is Kavindu's: four threat types, each with a base severity and
 * a small set of defense actions -- exactly one correct per threat, the
 * rest wrong on purpose. Every action carries its own explanation so a
 * player learns *why* a response worked or didn't, rather than just
 * guessing until something sticks.
 *
 * Everything here is fictional. No real attack technique, tool, or
 * telemetry -- see spec 52.
 */

export const THREAT_TYPES = {
  unauthorizedAccess: {
    id: 'unauthorized-access',
    label: 'Unauthorized Access',
    baseSeverity: 'medium',
    summary: 'A login succeeded using credentials that do not match the usual pattern for this account.',
    actions: [
      {
        id: 'revoke-credentials',
        label: 'Revoke the credentials and force re-authentication',
        correct: true,
        explanation:
          'The session was established with a valid-looking credential, so the credential itself is what needs to be invalidated -- revoking it ends the current session and any others it opened.',
      },
      {
        id: 'monitor-only',
        label: 'Monitor the account and take no action',
        correct: false,
        explanation:
          'Watching tells you what an intruder does next, but it does nothing to stop them doing it -- the access stays open the whole time.',
      },
      {
        id: 'restart-service',
        label: 'Restart the authentication service',
        correct: false,
        explanation:
          'A restart clears the service, not the credential. Whatever let the login through the first time is still valid after the service comes back up.',
      },
    ],
  },

  trafficFlood: {
    id: 'traffic-flood',
    label: 'Traffic Flood',
    baseSeverity: 'high',
    summary: 'Inbound request volume to a single endpoint has climbed far past its normal baseline.',
    actions: [
      {
        id: 'rate-limit',
        label: 'Apply rate limiting to the affected endpoint',
        correct: true,
        explanation:
          'A flood is a volume problem, and rate limiting caps volume directly at the point of entry, without needing to know who is sending the traffic or why.',
      },
      {
        id: 'restart-service',
        label: 'Restart the affected service',
        correct: false,
        explanation:
          'The service was not broken, it was overwhelmed -- a fresh instance faces the exact same flood the moment it comes back online.',
      },
      {
        id: 'revoke-credentials',
        label: 'Revoke all active credentials',
        correct: false,
        explanation:
          'A flood is not a credential problem, and most flood traffic is not authenticated at all -- this disrupts legitimate users without touching the actual flood.',
      },
    ],
  },

  maliciousPayload: {
    id: 'malicious-payload',
    label: 'Malicious Payload',
    baseSeverity: 'critical',
    summary: 'An uploaded file matches a signature associated with known malicious payloads.',
    actions: [
      {
        id: 'quarantine-payload',
        label: 'Quarantine the file before it is processed',
        correct: true,
        explanation:
          'The danger is in the payload actually running or being read by something downstream -- quarantining isolates it before that can happen.',
      },
      {
        id: 'monitor-only',
        label: 'Log the upload and take no action',
        correct: false,
        explanation:
          'A payload that matches a known-malicious signature does not need more observation to be understood -- leaving it in place is leaving the danger in place.',
      },
      {
        id: 'rate-limit',
        label: 'Rate limit the upload endpoint',
        correct: false,
        explanation:
          'This threat is about what one file contains, not how many requests are arriving -- slowing new uploads does nothing about the payload already sitting there.',
      },
    ],
  },

  serviceDisruption: {
    id: 'service-disruption',
    label: 'Service Disruption',
    baseSeverity: 'medium',
    summary: 'A core service is responding with errors or has stopped responding entirely.',
    actions: [
      {
        id: 'restart-service',
        label: 'Restart the affected service',
        correct: true,
        explanation:
          "When a service itself has stopped responding correctly, restarting it is what actually restores the behaviour -- there's no external traffic or credential to fix here.",
      },
      {
        id: 'rate-limit',
        label: 'Apply rate limiting to incoming requests',
        correct: false,
        explanation:
          'Rate limiting protects a healthy service from too much traffic -- it does nothing to fix a service that is already failing on its own.',
      },
      {
        id: 'quarantine-payload',
        label: 'Quarantine recent uploads',
        correct: false,
        explanation:
          "There's no payload involved in this threat -- quarantining files does not address a service that has stopped responding.",
      },
    ],
  },
}

export const THREAT_TYPE_LIST = Object.values(THREAT_TYPES)

/** Severity scale used to step a threat up when system health is low. */
const SEVERITY_ORDER = ['low', 'medium', 'high', 'critical']

/**
 * Resolves a threat type's actual severity for this occurrence.
 *
 * Kavindu's design: severity is the type's base severity, stepped up one
 * level when the world is already unhealthy -- the same threat reads as
 * more dangerous when defenses are already stretched thin, same as a
 * real system under load.
 */
export function resolveSeverity(threatType, worldHealth) {
  const baseIndex = SEVERITY_ORDER.indexOf(threatType.baseSeverity)
  const escalate = worldHealth < 50 ? 1 : 0
  const index = Math.min(baseIndex + escalate, SEVERITY_ORDER.length - 1)
  return SEVERITY_ORDER[index]
}
