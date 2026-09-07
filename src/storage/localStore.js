/**
 * Persistence adapter over localStorage.
 *
 * Exactly one place knows the storage keys, one place handles quota
 * errors and corrupted JSON, and one place implements "reset progress".
 *
 * localStorage throws outright in some browser privacy modes (Safari
 * private browsing, cookies-blocked settings). Every function here has
 * to survive that rather than take the page down with it -- a player
 * who cannot persist should still get a fully playable session, they
 * just start fresh next time.
 */

const KEY_PREFIX = 'cloudverse:'

export const STORAGE_KEYS = {
  PROGRESS: `${KEY_PREFIX}progress`,
}

/**
 * Reads and parses a stored value.
 *
 * Returns fallback for every failure mode there is: storage unavailable,
 * key absent, or JSON that no longer parses because an older build wrote
 * a different shape. A corrupted key must never be fatal.
 */
export function readJSON(key, fallback = null) {
  try {
    const raw = window.localStorage.getItem(key)
    if (raw === null) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

/**
 * Serialises and stores a value.
 *
 * Returns whether the write actually landed, so a caller that cares can
 * tell "saved" from "running without persistence" instead of assuming
 * success. Quota exhaustion and privacy-mode blocks both land here.
 */
export function writeJSON(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

/** Removes a single key, tolerating storage being unavailable. */
export function removeKey(key) {
  try {
    window.localStorage.removeItem(key)
    return true
  } catch {
    return false
  }
}

/**
 * Reset progress: clears every key this app owns, and nothing else.
 *
 * Deliberately not localStorage.clear() -- the app does not own the
 * whole origin and must not wipe keys another tool put there.
 */
export function clearAll() {
  return Object.values(STORAGE_KEYS).every((key) => removeKey(key))
}
