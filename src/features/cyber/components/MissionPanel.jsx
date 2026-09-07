import { MISSION_STATUS } from '../../../game/missionState'
import './MissionPanel.css'

const STATUS_LABEL = {
  [MISSION_STATUS.LOCKED]: 'Locked',
  [MISSION_STATUS.AVAILABLE]: 'In progress',
  [MISSION_STATUS.COMPLETE]: 'Complete',
}

/**
 * Missions panel: the unlock chain, with each mission's current status.
 *
 * Presentational only -- which missions exist is data/missions.js, and
 * what counts as complete is game/missionState.js. This component is
 * handed the already-decided list and only renders it.
 *
 * A locked mission still shows its title so the chain reads as a path
 * rather than a blank space, but its description stays hidden until it
 * unlocks -- the goal is a reason to keep playing, not a checklist to
 * read straight through.
 */
export default function MissionPanel({ missions }) {
  return (
    <ul className="mission-panel">
      {missions.map(({ mission, status }) => (
        <li key={mission.id} className={`mission-panel__item mission-panel__item--${status}`}>
          <div className="mission-panel__row">
            <span className="mission-panel__title">{mission.title}</span>
            <span className={`mission-panel__status mission-panel__status--${status}`}>
              {STATUS_LABEL[status]}
            </span>
          </div>
          {status !== MISSION_STATUS.LOCKED && (
            <p className="mission-panel__description">{mission.description}</p>
          )}
        </li>
      ))}
    </ul>
  )
}
