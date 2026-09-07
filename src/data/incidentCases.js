/**
 * Incident case catalogue — content, not logic.
 *
 * Each case is a scenario a junior analyst could plausibly be handed:
 * some evidence that matters, some that does not, and a root cause that
 * only becomes obvious once the relevant events are read in order.
 *
 * The rules that decide whether the player read it correctly live in
 * game/evidenceCorrelation.js and game/incidentResponse.js. This file
 * only says what the incidents are, so a backend could serve exactly
 * this shape later without any rule crossing the wire.
 *
 * EVERYTHING HERE IS FICTIONAL. The hostnames, addresses, accounts and
 * log lines are invented for this simulation. Nothing in CLOUDVERSE
 * observes, scans or touches a real system (spec 52).
 *
 * Evidence shape:
 *   id            stable key
 *   atMinute      minutes from detection, for ordering the timeline
 *   time          display label
 *   source        which fictional system produced it
 *   eventType     what kind of record it is
 *   severity      low | medium | high | critical
 *   description   what the record says
 *   relevant      whether it belongs to the actual attack chain
 *   correlationId groups the events that belong to the same chain
 */

export const INCIDENT_CASES = [
  {
    id: 'login-burst',
    caseId: 'CV-001',
    title: 'Suspicious Login Burst',
    severity: 'high',
    affectedSystem: 'auth-gateway',
    initialRisk: 35,
    description:
      'Authentication attempts against a single administrative account climbed far past the normal rate, then stopped abruptly.',
    evidence: [
      {
        id: 'lb-1',
        atMinute: 0,
        time: '09:41',
        source: 'auth-gateway',
        eventType: 'authentication',
        severity: 'medium',
        description: '214 failed sign-in attempts for account "svc-deploy" from a single source in 90 seconds.',
        relevant: true,
        correlationId: 'chain-credential',
      },
      {
        id: 'lb-2',
        atMinute: 2,
        time: '09:43',
        source: 'auth-gateway',
        eventType: 'authentication',
        severity: 'critical',
        description: 'Successful sign-in for "svc-deploy" from the same source, immediately after the failures stopped.',
        relevant: true,
        correlationId: 'chain-credential',
      },
      {
        id: 'lb-3',
        atMinute: 4,
        time: '09:45',
        source: 'identity-service',
        eventType: 'privilege',
        severity: 'critical',
        description: 'Account "svc-deploy" was added to an administrative group four minutes after sign-in.',
        relevant: true,
        correlationId: 'chain-credential',
      },
      {
        id: 'lb-4',
        atMinute: 3,
        time: '09:44',
        source: 'monitoring',
        eventType: 'system',
        severity: 'low',
        description: 'Scheduled nightly backup job completed successfully.',
        relevant: false,
        correlationId: null,
      },
      {
        id: 'lb-5',
        atMinute: 6,
        time: '09:47',
        source: 'app-server',
        eventType: 'application',
        severity: 'low',
        description: 'Cache warm-up routine ran on schedule.',
        relevant: false,
        correlationId: null,
      },
    ],
    rootCauseOptions: [
      {
        id: 'traffic-spike',
        label: 'A normal traffic spike',
        correct: false,
        explanation:
          'A traffic spike would raise request volume broadly. Here the attempts targeted one account and stopped the moment one succeeded — that is a guessing campaign finding an answer, not load.',
      },
      {
        id: 'compromised-credentials',
        label: 'Compromised credentials on a service account',
        correct: true,
        explanation:
          'Repeated failures against one account, a success immediately after they stop, then a privilege change minutes later. That order is the signature: the account was guessed into, then widened.',
      },
      {
        id: 'db-maintenance',
        label: 'Scheduled database maintenance',
        correct: false,
        explanation:
          'Maintenance windows do not produce failed authentication bursts, and the backup job in the timeline finished normally — it is unrelated to the sign-ins.',
      },
      {
        id: 'misconfigured-deploy',
        label: 'A misconfigured deployment retrying',
        correct: false,
        explanation:
          'A retrying deployment would fail with the same credentials repeatedly and never suddenly succeed, and it would not follow up by granting itself an administrative group.',
      },
    ],
  },

  {
    id: 'deployment-artifact',
    caseId: 'CV-002',
    title: 'Malicious Deployment Artifact',
    severity: 'critical',
    affectedSystem: 'build-pipeline',
    initialRisk: 55,
    description:
      'A build artifact that had already passed review was replaced before it reached the deployment stage.',
    evidence: [
      {
        id: 'da-1',
        atMinute: 0,
        time: '14:02',
        source: 'build-pipeline',
        eventType: 'deployment',
        severity: 'low',
        description: 'Build #4471 completed and its artifact checksum was recorded.',
        relevant: true,
        correlationId: 'chain-supply',
      },
      {
        id: 'da-2',
        atMinute: 8,
        time: '14:10',
        source: 'artifact-store',
        eventType: 'file',
        severity: 'critical',
        description: 'Stored artifact for build #4471 now reports a different checksum from the one recorded at build time.',
        relevant: true,
        correlationId: 'chain-supply',
      },
      {
        id: 'da-3',
        atMinute: 11,
        time: '14:13',
        source: 'build-pipeline',
        eventType: 'deployment',
        severity: 'high',
        description: 'Deployment of build #4471 to staging began using the stored artifact.',
        relevant: true,
        correlationId: 'chain-supply',
      },
      {
        id: 'da-4',
        atMinute: 9,
        time: '14:11',
        source: 'monitoring',
        eventType: 'system',
        severity: 'low',
        description: 'Build agent disk usage crossed 70 percent.',
        relevant: false,
        correlationId: null,
      },
      {
        id: 'da-5',
        atMinute: 14,
        time: '14:16',
        source: 'app-server',
        eventType: 'network',
        severity: 'high',
        description: 'Staging instance opened an outbound connection to an address absent from every previous release.',
        relevant: true,
        correlationId: 'chain-supply',
      },
    ],
    rootCauseOptions: [
      {
        id: 'artifact-tampering',
        label: 'The artifact was replaced after review',
        correct: true,
        explanation:
          'The checksum recorded at build time and the one in the store no longer match, and the deployment used the stored copy. Whatever was reviewed is not what shipped.',
      },
      {
        id: 'flaky-build',
        label: 'A flaky build produced a bad binary',
        correct: false,
        explanation:
          'A flaky build fails or produces a broken artifact at build time. It does not change the checksum of an artifact that already finished, and it would not open a new outbound connection.',
      },
      {
        id: 'disk-pressure',
        label: 'Disk pressure on the build agent corrupted the artifact',
        correct: false,
        explanation:
          'Corruption breaks an artifact; it does not produce one that deploys cleanly and then reaches a specific new address. The disk warning is real but unrelated.',
      },
      {
        id: 'stale-cache',
        label: 'A stale cache served an older build',
        correct: false,
        explanation:
          'An older build would carry an older checksum that had itself been recorded before. This checksum matches no build in the history.',
      },
    ],
  },

  {
    id: 'database-access',
    caseId: 'CV-003',
    title: 'Abnormal Database Access',
    severity: 'high',
    affectedSystem: 'database-lake',
    initialRisk: 45,
    description:
      'A reporting account began reading far more of the customer table than any report requires.',
    evidence: [
      {
        id: 'db-1',
        atMinute: 0,
        time: '02:14',
        source: 'database-lake',
        eventType: 'application',
        severity: 'medium',
        description: 'Reporting account issued a full-table read against the customer table.',
        relevant: true,
        correlationId: 'chain-exfil',
      },
      {
        id: 'db-2',
        atMinute: 3,
        time: '02:17',
        source: 'database-lake',
        eventType: 'application',
        severity: 'high',
        description: 'The same account repeated the read eleven times in three minutes, each time paging further.',
        relevant: true,
        correlationId: 'chain-exfil',
      },
      {
        id: 'db-3',
        atMinute: 7,
        time: '02:21',
        source: 'firewall',
        eventType: 'network',
        severity: 'high',
        description: 'Sustained outbound transfer from the reporting host, roughly matching the volume read.',
        relevant: true,
        correlationId: 'chain-exfil',
      },
      {
        id: 'db-4',
        atMinute: 1,
        time: '02:15',
        source: 'monitoring',
        eventType: 'system',
        severity: 'low',
        description: 'Database replica lag rose to 400 ms and recovered.',
        relevant: false,
        correlationId: null,
      },
      {
        id: 'db-5',
        atMinute: 5,
        time: '02:19',
        source: 'app-server',
        eventType: 'application',
        severity: 'low',
        description: 'Nightly report generation started, as it does every night at this hour.',
        relevant: false,
        correlationId: null,
      },
    ],
    rootCauseOptions: [
      {
        id: 'data-exfiltration',
        label: 'Data is being read out through a reporting account',
        correct: true,
        explanation:
          'Paging repeatedly through an entire customer table and then sending a matching volume outbound is collection followed by removal. A report reads what it needs and writes a result, not the whole table.',
      },
      {
        id: 'nightly-report',
        label: 'The nightly report is doing its normal work',
        correct: false,
        explanation:
          'The nightly job did run, and it is in the timeline — but it started after the reads began and does not account for the outbound transfer.',
      },
      {
        id: 'replica-lag',
        label: 'Replica lag caused repeated retries',
        correct: false,
        explanation:
          'Retries repeat the same query. These reads paged steadily further through the table, which is progress, not repetition — and lag recovered on its own.',
      },
      {
        id: 'index-rebuild',
        label: 'An index rebuild scanned the table',
        correct: false,
        explanation:
          'An index rebuild is database-internal work; it does not run as a reporting account, and it does not send data out of the network.',
      },
    ],
  },
]

export const INCIDENT_CASE_LIST = INCIDENT_CASES

/** Look up one case definition by id. */
export function findIncidentCase(caseKey) {
  return INCIDENT_CASES.find((c) => c.id === caseKey) ?? null
}
