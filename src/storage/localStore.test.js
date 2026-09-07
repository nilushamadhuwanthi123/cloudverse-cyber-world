import { afterEach, describe, expect, it, vi } from 'vitest'
import { STORAGE_KEYS, clearAll, readJSON, removeKey, writeJSON } from './localStore'

/** A minimal in-memory stand-in for localStorage. */
function fakeStorage() {
  const map = new Map()
  return {
    map,
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, value),
    removeItem: (key) => map.delete(key),
  }
}

const useStorage = (storage) => {
  vi.stubGlobal('window', { localStorage: storage })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('readJSON', () => {
  it('returns the parsed value that was stored', () => {
    const storage = fakeStorage()
    storage.map.set('key', JSON.stringify({ score: 42 }))
    useStorage(storage)

    expect(readJSON('key', null)).toEqual({ score: 42 })
  })

  it('returns the fallback when the key is absent', () => {
    useStorage(fakeStorage())
    expect(readJSON('missing', { fresh: true })).toEqual({ fresh: true })
  })

  it('returns the fallback rather than throwing on corrupted JSON', () => {
    const storage = fakeStorage()
    storage.map.set('key', '{ not valid json')
    useStorage(storage)

    expect(readJSON('key', { recovered: true })).toEqual({ recovered: true })
  })

  it('survives storage being unavailable, as in a browser privacy mode', () => {
    vi.stubGlobal('window', {
      get localStorage() {
        throw new Error('SecurityError: localStorage is disabled')
      },
    })

    expect(readJSON('key', { fresh: true })).toEqual({ fresh: true })
  })
})

describe('writeJSON', () => {
  it('stores a serialised value and reports success', () => {
    const storage = fakeStorage()
    useStorage(storage)

    expect(writeJSON('key', { a: 1 })).toBe(true)
    expect(storage.map.get('key')).toBe(JSON.stringify({ a: 1 }))
  })

  it('reports failure instead of throwing when the quota is exhausted', () => {
    const storage = fakeStorage()
    storage.setItem = () => {
      throw new Error('QuotaExceededError')
    }
    useStorage(storage)

    expect(writeJSON('key', { a: 1 })).toBe(false)
  })

  it('reports failure when storage is unavailable', () => {
    vi.stubGlobal('window', {
      get localStorage() {
        throw new Error('SecurityError')
      },
    })

    expect(writeJSON('key', { a: 1 })).toBe(false)
  })
})

describe('removeKey', () => {
  it('removes a stored key', () => {
    const storage = fakeStorage()
    storage.map.set('key', '1')
    useStorage(storage)

    expect(removeKey('key')).toBe(true)
    expect(storage.map.has('key')).toBe(false)
  })
})

describe('clearAll', () => {
  it('clears the keys this app owns and leaves everything else alone', () => {
    const storage = fakeStorage()
    storage.map.set(STORAGE_KEYS.PROGRESS, '{"securityScore":1}')
    storage.map.set('another-app:settings', 'do not touch')
    useStorage(storage)

    expect(clearAll()).toBe(true)
    expect(storage.map.has(STORAGE_KEYS.PROGRESS)).toBe(false)
    expect(storage.map.get('another-app:settings')).toBe('do not touch')
  })

  it('reports failure rather than throwing when storage is unavailable', () => {
    vi.stubGlobal('window', {
      get localStorage() {
        throw new Error('SecurityError')
      },
    })

    expect(clearAll()).toBe(false)
  })
})
