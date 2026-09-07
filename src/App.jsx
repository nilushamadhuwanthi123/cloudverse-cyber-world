/**
 * Temporary token preview - replaced by the real intro in Phase 3.
 * Exists so the design system can be checked by eye before anything
 * is built on top of it.
 *
 * Inline styles are used here only because this screen is disposable.
 * Real components get their own CSS.
 */
const SEVERITIES = [
  ['LOW', 'var(--sev-low)'],
  ['MEDIUM', 'var(--sev-medium)'],
  ['HIGH', 'var(--sev-high)'],
  ['CRITICAL', 'var(--sev-critical)'],
]

const DISTRICTS = [
  ['CLOUD', 'var(--district-cloud-primary)'],
  ['DEVOPS', 'var(--district-devops-primary)'],
  ['CYBER', 'var(--district-cyber-primary)'],
]

export default function App() {
  return (
    <main
      style={{
        padding: 'var(--space-7) var(--space-5)',
        maxWidth: '60rem',
        margin: '0 auto',
      }}
    >
      <p
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--text-xs)',
          letterSpacing: 'var(--tracking-wider)',
          textTransform: 'uppercase',
          color: 'var(--accent-primary)',
        }}
      >
        Phase 2 &mdash; design system
      </p>

      <h1
        style={{
          fontSize: 'var(--text-3xl)',
          letterSpacing: 'var(--tracking-wide)',
          margin: 'var(--space-2) 0',
        }}
      >
        CLOUDVERSE
      </h1>

      <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-6)' }}>
        Enter the digital world
      </p>

      <section
        style={{
          background: 'var(--glass-bg)',
          border: '1px solid var(--glass-border)',
          backdropFilter: 'blur(var(--glass-blur))',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-5)',
          boxShadow: 'var(--glow-cyan)',
        }}
      >
        <h2
          style={{
            fontSize: 'var(--text-sm)',
            letterSpacing: 'var(--tracking-wider)',
            textTransform: 'uppercase',
            color: 'var(--text-secondary)',
            marginBottom: 'var(--space-4)',
          }}
        >
          Threat severity
        </h2>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
          {SEVERITIES.map(([label, colour]) => (
            <span
              key={label}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-xs)',
                letterSpacing: 'var(--tracking-wide)',
                padding: 'var(--space-2) var(--space-3)',
                borderRadius: 'var(--radius-sm)',
                border: `1px solid ${colour}`,
                color: colour,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: colour,
                }}
              />
              {label}
            </span>
          ))}
        </div>

        <h2
          style={{
            fontSize: 'var(--text-sm)',
            letterSpacing: 'var(--tracking-wider)',
            textTransform: 'uppercase',
            color: 'var(--text-secondary)',
            margin: 'var(--space-5) 0 var(--space-4)',
          }}
        >
          District identity
        </h2>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
          {DISTRICTS.map(([label, colour]) => (
            <span
              key={label}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-xs)',
                letterSpacing: 'var(--tracking-wider)',
                padding: 'var(--space-2) var(--space-4)',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--surface-2)',
                borderLeft: `2px solid ${colour}`,
                color: 'var(--text-primary)',
              }}
            >
              {label}
            </span>
          ))}
        </div>

        <button
          type="button"
          style={{
            marginTop: 'var(--space-5)',
            background: 'var(--accent-primary)',
            color: 'var(--text-on-accent)',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-3) var(--space-5)',
            fontSize: 'var(--text-sm)',
            letterSpacing: 'var(--tracking-wide)',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'transform var(--dur-fast) var(--ease-out)',
          }}
        >
          ACTIVATE FIREWALL
        </button>
      </section>

      <p
        style={{
          marginTop: 'var(--space-6)',
          fontSize: 'var(--text-xs)',
          color: 'var(--text-muted)',
        }}
      >
        Temporary preview. Replaced by the intro sequence in Phase 3.
      </p>
    </main>
  )
}
