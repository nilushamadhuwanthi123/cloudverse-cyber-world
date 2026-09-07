import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadMissions, loadProgress, resetProgress, saveProgress } from './progressService'
import { INITIAL_PROGRESS } from '../game/missionState'
import { MISSIONS } from '../data/missions'
import { STORAGE_KEYS } from '../storage/localStore'

function useStorage(initial = {}) {
  const map = new Map(Object.entries(initial))
  vi.stubGlobal('window', {
    localStorage: {
      getItem: (key) => (map.has(key) ? map.get(key) : null),
      setItem: (key, value) => map.set(key, value),
      removeItem: (key) => map.delete(key),
    },
  })
  return map
}

const store = (progress) => ({ [STORAGE_KEYS.PROGRESS]: JSON.stringify(progress) })

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('loadProgress', () => {
  it('returns a fresh run when nothing has been saved', async () => {
    useStorage()
    await expect(loadProgress()).resolves.toEqual(INITIAL_PROGRESS)
  })

  it('round-trips saved progress', async () => {
    useStorage()
    const progress = {
      completedMissionIds: ['first-response'],
      correctResponses: 3,
      correctResponsesAllDefensesOn: 2,
      bestStreak: 3,
      securityScore: 36,
      worldHealth: 90,
    }

    await saveProgress(progress)
    await expect(loadProgress()).resolves.toEqual(progress)
  })

  it('fills in counters an older build never wrote', async () => {
    useStorage(store({ completedMissionIds: ['first-response'], correctResponses: 5 }))

    const loaded = await loadProgress()

    expect(loaded.correctResponses).toBe(5)
    expect(loaded.correctResponsesAllDefensesOn).toBe(0)
    expect(loaded.worldHealth).toBe(INITIAL_PROGRESS.worldHealth)
  })

  it('drops mission ids that no longer exist', async () => {
    useStorage(store({ completedMissionIds: ['first-response', 'mission-since-deleted'] }))

    const loaded = await loadProgress()
    expect(loaded.completedMissionIds).toEqual(['first-response'])
  })

  it('falls back to defaults for values of the wrong type', async () => {
    useStorage(
      store({
        completedMissionIds: 'not-an-array',
        correctResponses: 'abc',
        bestStreak: null,
        securityScore: Number.NaN,
      })
    )

    await expect(loadProgress()).resolves.toEqual(INITIAL_PROGRESS)
  })

  it('falls back to defaults when the stored payload is not an object', async () => {
    useStorage(store('just a string'))
    await expect(loadProgress()).resolves.toEqual(INITIAL_PROGRESS)
  })

  it('returns a playable fresh run when storage is unavailable', async () => {
    vi.stubGlobal('window', {
      get localStorage() {
        throw new Error('SecurityError')
      },
    })

    await expect(loadProgress()).resolves.toEqual(INITIAL_PROGRESS)
  })
})

describe('saveProgress', () => {
  it('reports whether the write actually landed', async () => {
    useStorage()
    await expect(saveProgress(INITIAL_PROGRESS)).resolves.toBe(true)

    vi.stubGlobal('window', {
      get localStorage() {
        throw new Error('SecurityError')
      },
    })
    await expect(saveProgress(INITIAL_PROGRESS)).resolves.toBe(false)
  })
})

describe('loadMissions', () => {
  it('returns the mission definitions', async () => {
    await expect(loadMissions()).resolves.toEqual(MISSIONS)
  })

  it('is async, so it can become a fetch without changing callers', () => {
    expect(loadMissions()).toBeInstanceOf(Promise)
  })
})

describe('resetProgress', () => {
  it('clears saved progress so the next load starts fresh', async () => {
    useStorage()
    await saveProgress({ ...INITIAL_PROGRESS, securityScore: 99 })

    await expect(resetProgress()).resolves.toBe(true)
    await expect(loadProgress()).resolves.toEqual(INITIAL_PROGRESS)
  })
})
