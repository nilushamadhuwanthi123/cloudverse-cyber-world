/**
 * Security score.
 *
 * Design: Kavindu -- distinct from world health on purpose. World health
 * is the district's current condition (can go up and down, clamped to
 * 0-100). Security score is a running record of how well the player has
 * been performing over the whole session: it only grows for a correct
 * response and only shrinks for a wrong one, plus a streak bonus for
 * consecutive correct responses in a row, so steady good decisions are
 * worth more than one lucky guess between mistakes.
 *
 * No real attack technique, tool, or telemetry -- this is a fictional
 * scoring model for the CLOUDVERSE game (spec 52).
 */

export const INITIAL_SECURITY_SCORE_STATE = {
  score: 0,
  streak: 0,
}

const CORRECT_POINTS = 10
const WRONG_POINTS = -5
const STREAK_BONUS_PER_STEP = 2
const STREAK_BONUS_CAP = 10

/**
 * Bonus for the streak the player is ON going into this response --
 * a streak of 3 correct responses in a row is worth more than the
 * first correct response after a mistake, capped so a very long streak
 * does not dwarf the base points.
 */
function streakBonus(streakBeforeThisResponse) {
  return Math.min(streakBeforeThisResponse * STREAK_BONUS_PER_STEP, STREAK_BONUS_CAP)
}

/**
 * Applies one defense response (correct or not) to the running score
 * state and returns the new state. Never mutates the input.
 */
export function applyResponseToScore(scoreState, correct) {
  if (correct) {
    const bonus = streakBonus(scoreState.streak)
    return {
      score: Math.max(0, scoreState.score + CORRECT_POINTS + bonus),
      streak: scoreState.streak + 1,
    }
  }

  return {
    score: Math.max(0, scoreState.score + WRONG_POINTS),
    streak: 0,
  }
}
