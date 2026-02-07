const INITIAL_SIGMA_SQ = 350_000;
const BASE_K = 32;
const SIGMA_DECAY = 0.85;

export interface RatedItem {
  mu: number;
  sigmaSq: number;
}

export interface RatingUpdate {
  winner: RatedItem;
  loser: RatedItem;
}

/**
 * Update Elo ratings for a winner/loser pair with dynamic K-factor
 * and uncertainty reduction.
 */
export function updateRatings(
  winner: RatedItem,
  loser: RatedItem
): RatingUpdate {
  const expectedWinner = 1 / (1 + Math.pow(10, (loser.mu - winner.mu) / 400));
  const expectedLoser = 1 - expectedWinner;

  const kWinner = BASE_K * (1 + winner.sigmaSq / INITIAL_SIGMA_SQ);
  const kLoser = BASE_K * (1 + loser.sigmaSq / INITIAL_SIGMA_SQ);

  return {
    winner: {
      mu: winner.mu + kWinner * (1 - expectedWinner),
      sigmaSq: winner.sigmaSq * SIGMA_DECAY,
    },
    loser: {
      mu: loser.mu - kLoser * expectedLoser,
      sigmaSq: loser.sigmaSq * SIGMA_DECAY,
    },
  };
}
