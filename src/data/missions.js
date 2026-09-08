/**
 * Mission definitions -- content, not logic.
 *
 * Each mission states a goal the player reaches through normal play in
 * a district. The rules that decide when one is complete live in
 * game/missionState.js; this file only says what the missions are, so a
 * backend can serve exactly this shape later without any rule moving
 * across the wire.
 *
 * `requires` is the unlock order: a mission stays locked until every
 * mission it names is complete. An empty list means it is open from the
 * start.
 */

export const MISSIONS = [
  {
    id: 'first-response',
    district: 'cyber',
    title: 'First Response',
    description: 'Resolve your first threat correctly in the Threat Monitor.',
    requires: [],
    goal: { type: 'correctResponses', count: 1 },
  },
  {
    id: 'steady-hands',
    district: 'cyber',
    title: 'Steady Hands',
    description: 'Resolve three threats correctly in a row without a wrong call.',
    requires: ['first-response'],
    goal: { type: 'streak', count: 3 },
  },
  {
    id: 'hold-the-line',
    district: 'cyber',
    title: 'Hold the Line',
    description: 'Reach a security score of 50 while keeping world health above 60.',
    requires: ['steady-hands'],
    goal: { type: 'scoreWithHealth', score: 50, minHealth: 60 },
  },
  {
    id: 'full-perimeter',
    district: 'cyber',
    title: 'Full Perimeter',
    description: 'Resolve five threats correctly with every defense rule left switched on.',
    requires: ['first-response'],
    goal: { type: 'correctResponsesAllDefensesOn', count: 5 },
  },
]

export const MISSION_LIST = MISSIONS

/** Look up one mission definition by id. */
export function findMission(missionId) {
  return MISSIONS.find((mission) => mission.id === missionId) ?? null
}
