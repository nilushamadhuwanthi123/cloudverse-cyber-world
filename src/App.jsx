/**
 * Application shell.
 *
 * Deliberately almost empty at this step. STEP 1 only proves the
 * toolchain works end to end -- the visual foundation lands in STEP 2,
 * the intro in STEP 3, and the world map in STEP 4. Adding any of that
 * now would mean rewriting it later.
 */
export default function App() {
  return (
    <main className="app-shell">
      <p className="app-shell__eyebrow">Project setup complete</p>
      <h1 className="app-shell__title">CLOUDVERSE</h1>
      <p className="app-shell__tagline">Enter the digital world</p>
      <p className="app-shell__note">
        Step 1 of 18 &mdash; toolchain running. The world gets built from Step 2 onward.
      </p>
    </main>
  )
}
