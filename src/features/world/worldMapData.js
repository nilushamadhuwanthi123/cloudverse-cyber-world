/**
 * World Map Data Definitions.
 *
 * Defines the spatial layout, district metadata, architectural subsystems,
 * and SVG energy conduit paths connecting the digital universe.
 */

export const WORLD_CANVAS = {
  width: 1000,
  height: 650,
}

export const WORLD_DISTRICTS = [
  {
    id: 'core',
    sectorNumber: '00',
    tag: 'SECTOR 00 // SYSTEM HUB',
    name: 'SYSTEM CORE',
    shortName: 'CORE',
    subtitle: 'Central Nexus & Neural Telemetry',
    description:
      'The central system hub orchestrating digital infrastructure, telemetry synchronization, and sector health across CLOUDVERSE.',
    actionLabel: 'SYSTEM CORE ACTIVE',
    isHub: true,
    position: {
      svgX: 500,
      svgY: 160,
      percentX: 50,
      percentY: 25,
    },
    subsystems: [
      { name: 'Neural Kernel', status: 'SYNCHRONIZED', desc: 'Global orchestration router' },
      { name: 'Power Matrix', status: 'OPTIMAL', desc: 'Sector energy distribution bus' },
      { name: 'Telemetry Mesh', status: 'MONITORING', desc: 'Real-time health ingestion' },
      { name: 'Subnet Bridge', status: 'LINKED', desc: 'Cross-district conduit fabric' },
    ],
    theme: {
      primaryColor: 'var(--cv-cyan)',
      secondaryColor: 'var(--cv-violet)',
      accentGradient: 'var(--core-gradient)',
      glowVar: 'var(--glow-cyan)',
    },
    specs: {
      architecture: 'Distributed Micro-Kernel',
      bandwidth: '128 Tbps Conduits',
      latency: '< 0.4ms Sector Interconnect',
    },
  },
  {
    id: 'cloud',
    sectorNumber: '01',
    tag: 'SECTOR 01 // FOUNDATION',
    name: 'CLOUD DISTRICT',
    shortName: 'CLOUD',
    subtitle: 'Compute, Storage & Database Infrastructure',
    description:
      'Elastic compute clusters, distributed block storage volumes, and low-latency database lakes forming the physical foundation of the digital world.',
    actionLabel: 'ENTER CLOUD DISTRICT',
    isHub: false,
    position: {
      svgX: 200,
      svgY: 460,
      percentX: 20,
      percentY: 71,
    },
    subsystems: [
      { name: 'Compute Cluster', status: 'ONLINE', desc: 'Scalable container worker pool' },
      { name: 'Storage Lake', status: 'HEALTHY', desc: 'Resilient high-durability object store' },
      { name: 'Database Engine', status: 'REPLICATED', desc: 'Distributed multi-region datastore' },
    ],
    theme: {
      primaryColor: 'var(--district-cloud-primary)',
      secondaryColor: 'var(--district-cloud-secondary)',
      accentGradient: 'linear-gradient(135deg, var(--district-cloud-primary), var(--district-cloud-secondary))',
      glowVar: 'var(--glow-cyan)',
    },
    specs: {
      architecture: 'Elastic Cloud Infrastructure',
      capacity: '99.999% SLA Uptime',
      latency: '1.2ms Local Loop',
    },
  },
  {
    id: 'devops',
    sectorNumber: '02',
    tag: 'SECTOR 02 // PIPELINE',
    name: 'DEVOPS DISTRICT',
    shortName: 'DEVOPS',
    subtitle: 'Automated CI/CD Delivery Highway',
    description:
      'Continuous deployment highway executing automated source compilation, test verification, container packaging, and zero-downtime production rollouts.',
    actionLabel: 'ENTER DEVOPS PIPELINE',
    isHub: false,
    position: {
      svgX: 500,
      svgY: 490,
      percentX: 50,
      percentY: 75,
    },
    subsystems: [
      { name: 'Code Repository', status: 'READY', desc: 'Version control branch mesh' },
      { name: 'Build & Test Engine', status: 'AUTOMATED', desc: 'Continuous integration runner' },
      { name: 'Delivery Highway', status: 'STREAMING', desc: 'Zero-downtime deployment orchestrator' },
    ],
    theme: {
      primaryColor: 'var(--district-devops-primary)',
      secondaryColor: 'var(--district-devops-secondary)',
      accentGradient: 'linear-gradient(135deg, var(--district-devops-primary), var(--district-devops-secondary))',
      glowVar: 'var(--glow-violet)',
    },
    specs: {
      architecture: 'Declarative GitOps Highway',
      stages: '6 Sequential Automated Gates',
      throughput: 'Instant Deployment Velocity',
    },
  },
  {
    id: 'cyber',
    sectorNumber: '03',
    tag: 'SECTOR 03 // DEFENSE',
    name: 'CYBER DISTRICT',
    shortName: 'CYBER',
    subtitle: 'Security Command & Threat Defense',
    description:
      'Proactive perimeter defenses, adaptive firewall rule matrices, deep packet telemetry inspection, and rapid incident response protocols.',
    actionLabel: 'ENTER SECURITY COMMAND',
    isHub: false,
    position: {
      svgX: 800,
      svgY: 460,
      percentX: 80,
      percentY: 71,
    },
    subsystems: [
      { name: 'Firewall Matrix', status: 'ARMED', desc: 'Layer 7 dynamic traffic inspection' },
      { name: 'Threat Radar', status: 'SCANNING', desc: 'Heuristic anomaly detection' },
      { name: 'Incident Protocol', status: 'ACTIVE', desc: 'Containment and mitigation console' },
    ],
    theme: {
      primaryColor: 'var(--cv-cyan)',
      secondaryColor: 'var(--cv-red)',
      accentGradient: 'linear-gradient(135deg, var(--cv-cyan), var(--cv-red))',
      glowVar: 'var(--glow-red)',
    },
    specs: {
      architecture: 'Zero-Trust Defense Mesh',
      inspection: 'Full Line-Rate Packet Analysis',
      mitigation: 'Adaptive Autonomous Mitigation',
    },
  },
]

export const WORLD_CONDUITS = [
  {
    id: 'core-cloud',
    from: 'core',
    to: 'cloud',
    label: 'CONDUIT ALPHA // HYPERVISOR FABRIC',
    path: 'M 470 190 C 400 270, 270 330, 220 420',
    color: 'var(--district-cloud-primary)',
  },
  {
    id: 'core-devops',
    from: 'core',
    to: 'devops',
    label: 'CONDUIT BETA // AUTOMATION SPINE',
    path: 'M 500 220 L 500 440',
    color: 'var(--district-devops-primary)',
  },
  {
    id: 'core-cyber',
    from: 'core',
    to: 'cyber',
    label: 'CONDUIT GAMMA // TELEMETRY SHIELD',
    path: 'M 530 190 C 600 270, 730 330, 780 420',
    color: 'var(--cv-red)',
  },
  {
    id: 'cloud-devops',
    from: 'cloud',
    to: 'devops',
    label: 'LATERAL BUS // ARTIFACT SYNC',
    path: 'M 240 480 C 320 530, 420 530, 460 500',
    color: 'var(--cv-blue)',
    isSecondary: true,
  },
  {
    id: 'devops-cyber',
    from: 'devops',
    to: 'cyber',
    label: 'LATERAL BUS // SECURITY AUDIT',
    path: 'M 540 500 C 580 530, 680 530, 760 480',
    color: 'var(--cv-violet)',
    isSecondary: true,
  },
]

export function findDistrict(id) {
  return WORLD_DISTRICTS.find((d) => d.id === id) || null
}
