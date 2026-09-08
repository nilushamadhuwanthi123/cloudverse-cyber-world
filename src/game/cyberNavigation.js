/**
 * Which Cyber sectors can be opened, and why not.
 *
 * Separate from the catalogue in data/cyberSectors.js on purpose: what
 * exists is content, what is reachable right now is a function of live
 * progress. Keeping the second one pure means the rail's disabled states
 * can be asserted as values rather than inspected in a rendered DOM.
 *
 * A planned sector is not a locked one. Locked means "you have not earned
 * this yet"; planned means "this is not built yet". Conflating them would
 * have the UI promise something no amount of play will deliver.
 */
import { CYBER_SECTORS, DEFAULT_SECTOR_ID, SECTOR_AVAILABILITY } from '../data/cyberSectors'

export const SECTOR_STATE = {
  ONLINE: 'online',
  LOCKED: 'locked',
  PLANNED: 'planned',
}

/**
 * Resolves one sector against progress.
 *
 * Returns the sector plus a `state` and, when it is not open, a `reason`
 * written for the player rather than for the developer.
 */
export function resolveSector(sector, progress) {
  if (sector.availability === SECTOR_AVAILABILITY.PLANNED) {
    return {
      ...sector,
      state: SECTOR_STATE.PLANNED,
      reason: 'Not deployed in this build yet.',
    }
  }

  if (sector.availability === SECTOR_AVAILABILITY.GATED) {
    const completed = progress?.completedMissionIds ?? []
    const met = completed.includes(sector.requires?.missionId)

    if (!met) {
      return {
        ...sector,
        state: SECTOR_STATE.LOCKED,
        reason: sector.requires?.reason ?? 'Complete the previous mission.',
      }
    }
  }

  return { ...sector, state: SECTOR_STATE.ONLINE, reason: null }
}

/** The whole catalogue, resolved in catalogue order. */
export function resolveSectors(progress) {
  return CYBER_SECTORS.map((sector) => resolveSector(sector, progress))
}

/** True when a sector can actually be entered right now. */
export function isSectorOnline(sectors, id) {
  return sectors.some((sector) => sector.id === id && sector.state === SECTOR_STATE.ONLINE)
}

/**
 * Where the district should land.
 *
 * A sector that exists is always shown, including a locked or undeployed
 * one -- selecting it is how the player finds out what it is and what
 * opens it, and bouncing them back to Operations instead would make the
 * rail feel broken rather than gated. Only an id this build does not
 * have falls back, so a save file naming a renamed or removed sector
 * cannot leave the district rendering nothing at all.
 */
export function landingSector(sectors, preferredId) {
  if (sectors.some((sector) => sector.id === preferredId)) return preferredId

  const firstOnline = sectors.find((sector) => sector.state === SECTOR_STATE.ONLINE)
  return firstOnline ? firstOnline.id : DEFAULT_SECTOR_ID
}

/**
 * Counts for the district header.
 *
 * Stated plainly ("3 of 9 sectors online") because a rail of nine items
 * where six are unavailable needs to say so before the player concludes
 * the build is broken.
 */
export function sectorTally(sectors) {
  return {
    total: sectors.length,
    online: sectors.filter((sector) => sector.state === SECTOR_STATE.ONLINE).length,
    locked: sectors.filter((sector) => sector.state === SECTOR_STATE.LOCKED).length,
    planned: sectors.filter((sector) => sector.state === SECTOR_STATE.PLANNED).length,
  }
}
