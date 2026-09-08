/**
 * DevOps Pipeline Failure & Incident Scenarios.
 *
 * Encapsulated within features/devops/ to handle controlled simulation
 * failures during pipeline execution:
 * - Build Dependency Failure
 * - Automated Test Failure
 * - Deployment Health Check Failure
 */

export const PIPELINE_INCIDENTS = [
  {
    id: 'build-failure',
    title: 'Build Dependency Integrity Failure',
    code: 'DEVOPS-INC-01',
    stageId: 'build',
    errorReason:
      'Dependency lockfile checksum mismatch detected during npm resolution. A simulated package hash did not match the manifest signature.',
    diagnosticDetails: 'Error: Integrity check failed for package @mesh/virtual-runtime@2.4.1 (SHA-512 mismatch).',
    recoveryAction: 'RETRY BUILD (SYNC LOCKFILE)',
    recoveryExplanation:
      'Purged build cache, synchronized package lockfile checksums, and re-executed Vite compilation in a clean container.',
  },
  {
    id: 'test-failure',
    title: 'Automated Test Regression Failure',
    code: 'DEVOPS-INC-02',
    stageId: 'test',
    errorReason:
      'Regression test assertion failed in security token validator suite. 1 of 81 tests reported an unhandled exception.',
    diagnosticDetails: 'FAIL: tokenValidator.test.js > token expiration window exceeded allowed drift tolerance (drift: 120ms > max: 50ms).',
    recoveryAction: 'RETRY TEST (APPLY HOTFIX)',
    recoveryExplanation:
      'Patched token expiration tolerance in unit test runner and re-executed the automated validation suite.',
  },
  {
    id: 'deploy-failure',
    title: 'Deployment Canary Readiness Probe Timeout',
    code: 'DEVOPS-INC-03',
    stageId: 'deploy',
    errorReason:
      'Canary pod failed liveness health check probe within 3000ms threshold. Automated cluster safety gate blocked traffic shift.',
    diagnosticDetails: 'Liveness probe failed: HTTP probe to /healthz timed out after 3.0s. Rollout paused at 10% canary traffic.',
    recoveryAction: 'RETRY DEPLOY (RECYCLE CANARY)',
    recoveryExplanation:
      'Recycled canary container with refreshed cluster endpoints and resumed zero-downtime rolling deployment.',
  },
]

/** Find failure incident by ID */
export function findPipelineIncident(id) {
  return PIPELINE_INCIDENTS.find((inc) => inc.id === id) || null
}

/** Find failure incident affecting a specific stage */
export function findIncidentForStage(stageId) {
  return PIPELINE_INCIDENTS.find((inc) => inc.stageId === stageId) || null
}
