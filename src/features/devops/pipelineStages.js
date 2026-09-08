/**
 * DevOps Pipeline Stage Configurations.
 *
 * Encapsulated locally within features/devops/ to adhere to architecture rules:
 * components never import directly from storage/ or external services.
 *
 * Defines the six core CI/CD stages:
 * CODE -> BUILD -> TEST -> PACKAGE -> DEPLOY -> LIVE
 */

export const STAGE_STATUS = {
  IDLE: 'idle',
  RUNNING: 'running',
  SUCCESS: 'success',
  FAILED: 'failed',
}

export const PIPELINE_STATUS = {
  READY: 'ready',
  RUNNING: 'running',
  SUCCESS: 'success',
  FAILED: 'failed',
}

export const PIPELINE_STAGES = [
  {
    id: 'code',
    code: 'STAGE // 01',
    name: 'CODE',
    title: 'Source Ingestion',
    shortDesc: 'Version control branch merge & commit verification',
    technicalExplanation:
      'Monitors trunk-based pull request merges, validates cryptographic commit signatures, and initiates webhook trigger payloads with dependency lockfile audits.',
    purpose: 'Source changes enter the pipeline with verified integrity and dependency manifests.',
    iconType: 'code',
    durationMs: 900,
    metrics: [
      { label: 'Commit Ref', value: 'git #8f2d9c' },
      { label: 'Source Branch', value: 'main' },
      { label: 'Committer', value: 'cyber-architect' },
      { label: 'Changeset', value: '14 files (+428 / -52)' },
      { label: 'Static Linting', value: '100% Passed (oxlint)' },
    ],
  },
  {
    id: 'build',
    code: 'STAGE // 02',
    name: 'BUILD',
    title: 'Artifact Compilation',
    shortDesc: 'Source compilation and bundle tree-shaking',
    technicalExplanation:
      'Compiles JSX and modern ECMAScript modules into deterministic production assets, resolves dependency trees, and prepares intermediate bytecode layers.',
    purpose: 'Source code is compiled and prepared into an optimized, deployable bundle.',
    iconType: 'build',
    durationMs: 1100,
    metrics: [
      { label: 'Target Output', value: 'dist/client-esm' },
      { label: 'Build Engine', value: 'Vite / esbuild' },
      { label: 'Compilation Time', value: '1.42s' },
      { label: 'Bundle Size', value: '289.3 kB (gzip: 89.8 kB)' },
      { label: 'Tree-Shaking', value: 'Optimized (92 modules)' },
    ],
  },
  {
    id: 'test',
    code: 'STAGE // 03',
    name: 'TEST',
    title: 'Automated Validation',
    shortDesc: 'Unit regression, security scan, and policy checks',
    technicalExplanation:
      'Executes deterministic Vitest test suites, regression verification, SAST security linting, and policy-as-code guardrails in an isolated container enclave.',
    purpose: 'Automated validation verifies build correctness and ensures zero regressions.',
    iconType: 'test',
    durationMs: 1000,
    metrics: [
      { label: 'Test Suites', value: '7 passed (81 tests)' },
      { label: 'Assertion Rate', value: '100% Successful' },
      { label: 'Test Runtime', value: '0.58s' },
      { label: 'Vulnerability Scan', value: '0 CVEs Detected' },
      { label: 'Enclave Isolation', value: 'Hardware cgroups' },
    ],
  },
  {
    id: 'package',
    code: 'STAGE // 04',
    name: 'PACKAGE',
    title: 'Container Vaulting',
    shortDesc: 'Container image tagging and registry vaulting',
    technicalExplanation:
      'Assembles immutable container images, signs manifest with cosign keyless infrastructure, and archives release bundle into the distributed artifact vault.',
    purpose: 'A tamper-proof, verified release container is archived for deployment.',
    iconType: 'package',
    durationMs: 950,
    metrics: [
      { label: 'Image Digest', value: 'sha256:7b4e9fa2c...' },
      { label: 'Container Size', value: '42.8 MB (distroless)' },
      { label: 'Artifact Vault', value: 'vault.cloudverse.mesh' },
      { label: 'Signature', value: 'Cosign Verified' },
      { label: 'Layer Cache', value: '5/6 Layers Hit' },
    ],
  },
  {
    id: 'deploy',
    code: 'STAGE // 05',
    name: 'DEPLOY',
    title: 'Rolling Orchestration',
    shortDesc: 'Zero-downtime canary rollout to cloud nodes',
    technicalExplanation:
      'Executes zero-downtime rolling canary rollout across multi-zone Kubernetes compute clusters with automated health check probes and instant rollback gates.',
    purpose: 'The release is safely promoted to cluster runtime environments.',
    iconType: 'deploy',
    durationMs: 1200,
    metrics: [
      { label: 'Rollout Strategy', value: 'Canary (10% -> 100%)' },
      { label: 'Target District', value: 'Compute Island Mesh' },
      { label: 'Pod Rollout', value: '8/8 Pods Ready' },
      { label: 'Health Probes', value: 'Passing (HTTP 200)' },
      { label: 'Traffic Weight', value: '100% Ingress' },
    ],
  },
  {
    id: 'live',
    code: 'STAGE // 06',
    name: 'LIVE',
    title: 'Production Runtime',
    shortDesc: 'Production workloads serving real digital traffic',
    technicalExplanation:
      'Ingress gateways route live user traffic to newly provisioned service instances, monitoring error budget burn rates and latency distributions in real time.',
    purpose: 'The application is serving users in the production cloud continuum.',
    iconType: 'live',
    durationMs: 800,
    metrics: [
      { label: 'Release Version', value: 'v1.0.4' },
      { label: 'Ingress Rate', value: '1,240 req/min' },
      { label: 'Error Rate', value: '0.001% (Nominal)' },
      { label: 'Service Health', value: 'ONLINE // OPTIMAL' },
      { label: 'Mesh Latency', value: '0.42 ms' },
    ],
  },
]

/** Returns default idle state for all six stages */
export function getInitialStageStates() {
  return Object.fromEntries(
    PIPELINE_STAGES.map((stage) => [stage.id, STAGE_STATUS.IDLE])
  )
}

/** Retrieve stage definition by ID */
export function findStage(id) {
  return PIPELINE_STAGES.find((stage) => stage.id === id) || null
}
