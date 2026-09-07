/**
 * Cloud District Location Data.
 *
 * Encapsulated locally within features/cloud/ to adhere to architecture rules:
 * components never import directly from data/ or storage/.
 */

export const CLOUD_LOCATIONS = [
  {
    id: 'compute',
    code: 'SECTOR // 01-A',
    title: 'Compute Island',
    subtitle: 'Distributed Processing & Virtualized Mesh',
    badge: 'PROCESSING CLUSTER',
    description:
      'A high-throughput floating cluster of elastic compute nodes and virtualized processing cores orchestrating distributed workloads across the cloud continuum.',
    status: 'ACTIVE // NOMINAL',
    statusVariant: 'stable',
    coordinates: 'GRID // 42.10 N · 18.44 E',
    telemetry: [
      { label: 'ALLOCATED CORES', value: '128 / 128' },
      { label: 'FABRIC LATENCY', value: '0.42 ms' },
      { label: 'CONTAINER FLEET', value: '1,024 NODES' },
      { label: 'CLUSTER LOAD', value: '68% OPTIMAL' },
    ],
    features: [
      'Elastic auto-scaling nodes with instant provisioning',
      'Zero-trust container isolation and hardware virtualization',
      'Dynamic workload orchestration across multi-zone regions',
    ],
    iconType: 'compute',
  },
  {
    id: 'storage',
    code: 'SECTOR // 01-B',
    title: 'Storage Valley',
    subtitle: 'Multi-Tier Object & Block Storage Expanse',
    badge: 'STORAGE FABRIC',
    description:
      'An expansive topological valley of tiered persistent volumes, distributed object vaults, and geo-replicated archival blocks designed for zero data loss.',
    status: 'SYNCED // REPLICATED',
    statusVariant: 'stable',
    coordinates: 'GRID // 38.82 N · 24.19 E',
    telemetry: [
      { label: 'PERSISTENT POOL', value: '4.8 PB' },
      { label: 'GEO-REDUNDANCY', value: '3x CROSS-REGION' },
      { label: 'STORAGE TIERS', value: 'HOT · COOL · COLD' },
      { label: 'THROUGHPUT', value: '250K IOPS' },
    ],
    features: [
      'High-durability distributed object storage with instant recall',
      'Continuous block encryption with quantum-resistant key cycles',
      'Automated lifecycle tiering from NVMe cache to cold archive',
    ],
    iconType: 'storage',
  },
  {
    id: 'database',
    code: 'SECTOR // 01-C',
    title: 'Database Lake',
    subtitle: 'High-Concurrency Relational & Vector Reservoir',
    badge: 'DATA RESERVOIR',
    description:
      'A deep digital reservoir maintaining continuous state synchronization, atomic transactional streams, and sub-millisecond query execution across relational and vector domains.',
    status: 'OPTIMIZED // STREAMING',
    statusVariant: 'stable',
    coordinates: 'GRID // 45.67 N · 31.05 E',
    telemetry: [
      { label: 'QUERY VELOCITY', value: '42.5K QPS' },
      { label: 'QUERY LATENCY', value: '0.88 ms' },
      { label: 'ENGINE TYPE', value: 'RELATIONAL + VECTOR' },
      { label: 'REPLICA DRIFT', value: '< 1.2 ms' },
    ],
    features: [
      'Strict serializable ACID transactions with distributed consensus',
      'Integrated high-dimensional vector embeddings for AI indexing',
      'Automatic read-replica sharding and zero-downtime schema evolution',
    ],
    iconType: 'database',
  },
]
