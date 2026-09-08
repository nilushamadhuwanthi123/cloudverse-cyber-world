import { describe, expect, it } from 'vitest'
import { CYBER_SECTORS } from '../data/cyberSectors'
import {
  SECTOR_STATE,
  isSectorOnline,
  landingSector,
  resolveSector,
  resolveSectors,
  sectorTally,
} from './cyberNavigation'

const fresh = { completedMissionIds: [] }
const afterFirstResponse = { completedMissionIds: ['first-response'] }

describe('resolveSectors', () => {
  it('resolves every sector in the catalogue, in catalogue order', () => {
    const resolved = resolveSectors(fresh)
    expect(resolved.map((sector) => sector.id)).toEqual(CYBER_SECTORS.map((sector) => sector.id))
  })

  it('opens Cyber Operations from the very first visit', () => {
    const operations = resolveSectors(fresh).find((sector) => sector.id === 'operations')
    expect(operations.state).toBe(SECTOR_STATE.ONLINE)
    expect(operations.reason).toBeNull()
  })

  // Locked and planned are different promises. One says "earn this", the
  // other says "this does not exist yet" -- telling a player to keep
  // playing for something no amount of play will deliver is a lie.
  it('keeps locked and planned apart', () => {
    const resolved = resolveSectors(fresh)
    const incident = resolved.find((sector) => sector.id === 'incident-response')
    const arcade = resolved.find((sector) => sector.id === 'arcade')

    expect(incident.state).toBe(SECTOR_STATE.LOCKED)
    expect(incident.reason).toContain('Answer one threat correctly')

    expect(arcade.state).toBe(SECTOR_STATE.PLANNED)
    expect(arcade.reason).toContain('Not deployed')
  })

  it('never reports a planned sector as unlockable, however much is completed', () => {
    const everything = { completedMissionIds: CYBER_SECTORS.map((sector) => sector.id).concat(['first-response']) }
    const arcade = resolveSectors(everything).find((sector) => sector.id === 'arcade')
    expect(arcade.state).toBe(SECTOR_STATE.PLANNED)
  })

  it('opens a gated sector once its mission is complete', () => {
    const incident = resolveSectors(afterFirstResponse).find((s) => s.id === 'incident-response')
    expect(incident.state).toBe(SECTOR_STATE.ONLINE)
    expect(incident.reason).toBeNull()
  })

  it('survives progress that is missing or malformed', () => {
    for (const progress of [undefined, null, {}, { completedMissionIds: 'nope' }]) {
      const resolved = resolveSectors(progress)
      expect(resolved.find((s) => s.id === 'operations').state).toBe(SECTOR_STATE.ONLINE)
    }
  })
})

describe('resolveSector', () => {
  it('does not mutate the catalogue entry it was given', () => {
    const [operations] = CYBER_SECTORS
    resolveSector(operations, fresh)
    expect(operations.state).toBeUndefined()
  })
})

describe('landingSector', () => {
  it('keeps the sector the player asked for when it is open', () => {
    const sectors = resolveSectors(afterFirstResponse)
    expect(landingSector(sectors, 'incident-response')).toBe('incident-response')
  })

  // Selecting a locked sector is how the player learns what opens it.
  // Bouncing them back to Operations would read as a broken rail.
  it('still lands on a sector that exists but is not open', () => {
    const sectors = resolveSectors(fresh)
    expect(landingSector(sectors, 'incident-response')).toBe('incident-response')
    expect(landingSector(sectors, 'arcade')).toBe('arcade')
  })

  // A save file naming a sector this build renamed or dropped must not
  // leave the district rendering nothing at all.
  it('falls back to the first open sector for an id this build does not have', () => {
    const sectors = resolveSectors(fresh)
    expect(landingSector(sectors, 'a-sector-that-never-existed')).toBe('operations')
    expect(landingSector(sectors, undefined)).toBe('operations')
  })
})

describe('isSectorOnline', () => {
  it('is false for locked, planned and unknown ids alike', () => {
    const sectors = resolveSectors(fresh)
    expect(isSectorOnline(sectors, 'operations')).toBe(true)
    expect(isSectorOnline(sectors, 'incident-response')).toBe(false)
    expect(isSectorOnline(sectors, 'arcade')).toBe(false)
    expect(isSectorOnline(sectors, 'nope')).toBe(false)
  })
})

describe('sectorTally', () => {
  it('adds up to the whole catalogue', () => {
    const tally = sectorTally(resolveSectors(fresh))
    expect(tally.total).toBe(CYBER_SECTORS.length)
    expect(tally.online + tally.locked + tally.planned).toBe(tally.total)
  })

  it('moves one sector from locked to online as the gate is met', () => {
    const before = sectorTally(resolveSectors(fresh))
    const after = sectorTally(resolveSectors(afterFirstResponse))

    expect(after.online).toBe(before.online + 1)
    expect(after.locked).toBe(before.locked - 1)
    expect(after.planned).toBe(before.planned)
  })
})
