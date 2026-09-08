/**
 * Forensic case files.
 *
 * Every host, address, hash, path and account below is invented for
 * CLOUDVERSE. The addresses are drawn from the ranges reserved for
 * documentation (RFC 5737: 192.0.2.0/24, 198.51.100.0/24,
 * 203.0.113.0/24), so nothing here can point at a real machine even by
 * accident. Nothing describes a real attack technique or tool.
 *
 * Note what is NOT in this file: a list of edges. Connections between
 * artefacts are derived from the indicators they share, in
 * game/forensics.js. Authoring the edges separately would let the
 * picture disagree with the evidence, and "the diagram says these are
 * linked but the data does not" is precisely the bug a forensics
 * exercise must not contain.
 *
 * `x` and `y` are percentages of the board. They are layout, not
 * meaning: the same case reads correctly as a plain list on a narrow
 * screen, where the board is not drawn at all.
 */

export const ARTIFACT_KIND = {
  FILE: 'file',
  PROCESS: 'process',
  CONNECTION: 'connection',
  ACCOUNT: 'account',
  LOG: 'log',
}

export const FORENSIC_CASES = Object.freeze([
  Object.freeze({
    id: 'artifact-swap',
    caseId: 'DF-001',
    title: 'A deployment that did not match its build',
    severity: 'high',
    brief:
      'The release that reached production has a different checksum from the one the build produced. Work out how, and how far it went.',
    artifacts: Object.freeze([
      Object.freeze({
        id: 'build-log',
        kind: ARTIFACT_KIND.LOG,
        label: 'Build #4471 completed',
        detail: 'Pipeline log entry for the release build.',
        at: '02:14:06',
        fields: Object.freeze([
          ['Source', 'pipeline.cloudverse.internal'],
          ['Produced', 'release-4471.tar.gz'],
          ['Checksum at build', 'a91f0c7e44b2'],
        ]),
        indicators: Object.freeze(['artifact:release-4471.tar.gz', 'hash:a91f0c7e44b2']),
        x: 16,
        y: 14,
      }),
      Object.freeze({
        id: 'artifact-store',
        kind: ARTIFACT_KIND.FILE,
        label: 'release-4471.tar.gz',
        detail: 'The stored copy of the release, read at deploy time.',
        at: '02:41:52',
        fields: Object.freeze([
          ['Path', '/srv/artifacts/release-4471.tar.gz'],
          ['Size', '48.2 MB'],
          ['Checksum now', '3d80be51fa17'],
          ['Modified by', 'svc-deploy'],
        ]),
        indicators: Object.freeze([
          'artifact:release-4471.tar.gz',
          'hash:3d80be51fa17',
          'account:svc-deploy',
        ]),
        x: 50,
        y: 14,
      }),
      Object.freeze({
        id: 'store-write',
        kind: ARTIFACT_KIND.LOG,
        label: 'Artifact store write',
        detail: 'A write to the artifact store between build and deploy.',
        at: '02:39:11',
        fields: Object.freeze([
          ['Account', 'svc-deploy'],
          ['Source address', '198.51.100.23'],
          ['Object', '/srv/artifacts/release-4471.tar.gz'],
        ]),
        indicators: Object.freeze([
          'account:svc-deploy',
          'ip:198.51.100.23',
          'artifact:release-4471.tar.gz',
        ]),
        x: 50,
        y: 45,
      }),
      Object.freeze({
        id: 'session',
        kind: ARTIFACT_KIND.ACCOUNT,
        label: 'svc-deploy session opened',
        detail: 'A service account session from an address it had not used before.',
        at: '02:37:40',
        fields: Object.freeze([
          ['Account', 'svc-deploy'],
          ['Source address', '198.51.100.23'],
          ['Method', 'API token'],
          ['Prior use of this address', 'none in 90 days'],
        ]),
        indicators: Object.freeze(['account:svc-deploy', 'ip:198.51.100.23']),
        x: 16,
        y: 45,
      }),
      Object.freeze({
        id: 'deploy',
        kind: ARTIFACT_KIND.PROCESS,
        label: 'Deployment to production',
        detail: 'The rollout that picked up the stored copy.',
        at: '02:42:03',
        fields: Object.freeze([
          ['Object deployed', '/srv/artifacts/release-4471.tar.gz'],
          ['Checksum deployed', '3d80be51fa17'],
          ['Result', 'Success — 6 of 6 instances'],
        ]),
        indicators: Object.freeze(['artifact:release-4471.tar.gz', 'hash:3d80be51fa17']),
        x: 84,
        y: 14,
      }),
      Object.freeze({
        id: 'egress',
        kind: ARTIFACT_KIND.CONNECTION,
        label: 'Outbound connection from production',
        detail: 'A connection a production instance had not made before.',
        at: '02:44:19',
        fields: Object.freeze([
          ['From', 'prod-instance-03'],
          ['To', '198.51.100.23:8443'],
          ['Bytes out', '2.1 MB'],
          ['Owning process', 'started from release-4471.tar.gz'],
        ]),
        // Two links, and both are real: the address ties it back to the
        // session and the store write, and the process provenance ties
        // it to what was actually deployed.
        indicators: Object.freeze(['ip:198.51.100.23', 'artifact:release-4471.tar.gz']),
        x: 84,
        y: 45,
      }),
      Object.freeze({
        id: 'nightly-backup',
        kind: ARTIFACT_KIND.PROCESS,
        label: 'Nightly backup job',
        detail: 'A scheduled job that runs every night at this hour.',
        at: '02:30:00',
        fields: Object.freeze([
          ['Account', 'svc-backup'],
          ['Source address', '192.0.2.10'],
          ['Result', 'Completed, 0 errors'],
        ]),
        // Shares nothing with the chain. It is here because a real
        // timeline is full of ordinary activity, and telling the two
        // apart is the skill being practised.
        indicators: Object.freeze(['account:svc-backup', 'ip:192.0.2.10']),
        x: 50,
        y: 78,
      }),
    ]),
    chain: Object.freeze(['session', 'store-write', 'artifact-store', 'deploy', 'egress']),
    keyIndicators: Object.freeze(['ip:198.51.100.23', 'account:svc-deploy']),
    conclusionOptions: Object.freeze([
      Object.freeze({
        id: 'stored-copy-replaced',
        label: 'The stored copy was replaced between build and deploy',
        correct: true,
        explanation:
          'The build produced a91f0c7e44b2. A write from 198.51.100.23 using svc-deploy landed on the stored object two minutes before the rollout, and what deployed was 3d80be51fa17. The pipeline did exactly what it was told; the thing it was told to deploy had changed underneath it.',
      }),
      Object.freeze({
        id: 'build-compromised',
        label: 'The build itself produced a bad artifact',
        correct: false,
        explanation:
          'The build log records a91f0c7e44b2, and nothing disputes it. The checksum only differs at the store, after a separate write. Blaming the build would send the response at a system that behaved correctly.',
      }),
      Object.freeze({
        id: 'backup-job',
        label: 'The nightly backup job corrupted the artifact',
        correct: false,
        explanation:
          'The backup ran at 02:30 under svc-backup from 192.0.2.10 and reported no errors. It shares no account, address or object with the chain — it is ordinary activity that happens to be nearby in time.',
      }),
      Object.freeze({
        id: 'instance-only',
        label: 'A single production instance was compromised directly',
        correct: false,
        explanation:
          'The outbound connection is real, but all six instances received the same changed artifact. Treating one instance as the origin would leave the other five running it.',
      }),
    ]),
  }),

  Object.freeze({
    id: 'token-reuse',
    caseId: 'DF-002',
    title: 'One token, two places at once',
    severity: 'medium',
    brief:
      'An API token is being used from two addresses within the same minute. Establish which use is the legitimate one.',
    artifacts: Object.freeze([
      Object.freeze({
        id: 'token-issued',
        kind: ARTIFACT_KIND.ACCOUNT,
        label: 'Token issued to reporting-api',
        detail: 'The token this case is about, and where it was meant to live.',
        at: '09:02:11',
        fields: Object.freeze([
          ['Token', 'tok_7Q…f4'],
          ['Issued to', 'reporting-api'],
          ['Bound address range', '192.0.2.0/24'],
        ]),
        indicators: Object.freeze(['token:tok_7Q', 'account:reporting-api']),
        x: 16,
        y: 30,
      }),
      Object.freeze({
        id: 'use-expected',
        kind: ARTIFACT_KIND.LOG,
        label: 'Token used from 192.0.2.31',
        detail: 'A read of the daily report, from inside the bound range.',
        at: '11:20:04',
        fields: Object.freeze([
          ['Token', 'tok_7Q…f4'],
          ['Source address', '192.0.2.31'],
          ['Action', 'GET /reports/daily'],
        ]),
        indicators: Object.freeze(['token:tok_7Q', 'ip:192.0.2.31', 'account:reporting-api']),
        x: 50,
        y: 12,
      }),
      Object.freeze({
        id: 'use-foreign',
        kind: ARTIFACT_KIND.LOG,
        label: 'Token used from 203.0.113.77',
        detail: 'The same token, from outside the range it is bound to.',
        at: '11:20:37',
        fields: Object.freeze([
          ['Token', 'tok_7Q…f4'],
          ['Source address', '203.0.113.77'],
          ['Action', 'GET /reports/export?all=true'],
        ]),
        indicators: Object.freeze(['token:tok_7Q', 'ip:203.0.113.77']),
        x: 50,
        y: 52,
      }),
      Object.freeze({
        id: 'bulk-read',
        kind: ARTIFACT_KIND.PROCESS,
        label: 'Bulk export started',
        detail: 'An export far larger than any this endpoint normally serves.',
        at: '11:21:02',
        fields: Object.freeze([
          ['Source address', '203.0.113.77'],
          ['Rows', '412,000'],
          ['Typical for this endpoint', 'under 5,000'],
        ]),
        indicators: Object.freeze(['ip:203.0.113.77']),
        x: 84,
        y: 32,
      }),
      Object.freeze({
        id: 'config-push',
        kind: ARTIFACT_KIND.PROCESS,
        label: 'Config push to reporting-api',
        detail: 'A routine configuration update to the same service.',
        at: '11:18:50',
        fields: Object.freeze([
          ['Account', 'svc-config'],
          ['Source address', '192.0.2.9'],
          ['Result', 'Applied'],
        ]),
        indicators: Object.freeze(['account:svc-config', 'ip:192.0.2.9']),
        x: 50,
        y: 88,
      }),
    ]),
    chain: Object.freeze(['token-issued', 'use-foreign', 'bulk-read']),
    keyIndicators: Object.freeze(['ip:203.0.113.77', 'token:tok_7Q']),
    conclusionOptions: Object.freeze([
      Object.freeze({
        id: 'token-used-outside-binding',
        label: 'The token is being used from outside the range it is bound to',
        correct: true,
        explanation:
          'One token, two addresses, thirty-three seconds apart. The use from 192.0.2.31 is inside the bound range and asks for the daily report the service exists to serve. The use from 203.0.113.77 is outside it and asks for everything. Revoking the token addresses both uses; blocking one address does not.',
      }),
      Object.freeze({
        id: 'reporting-api-compromised',
        label: 'The reporting-api host itself has been taken over',
        correct: false,
        explanation:
          'Nothing places the second use on the reporting-api host. The token left the host; the host behaved normally throughout, including serving the legitimate read a moment earlier.',
      }),
      Object.freeze({
        id: 'config-push-caused-it',
        label: 'The config push widened the token binding',
        correct: false,
        explanation:
          'The push came from svc-config at 192.0.2.9 and applied cleanly. It shares no token or address with either use — it is nearby in time and unrelated in evidence.',
      }),
    ]),
  }),
])

export const FORENSIC_CASE_IDS = FORENSIC_CASES.map((forensicCase) => forensicCase.id)
