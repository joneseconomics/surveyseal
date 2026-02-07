import { updateRatings } from "./scoring";

interface ComparisonRecord {
  leftItemId: string;
  rightItemId: string;
  winnerId: string;
}

interface ItemRecord {
  id: string;
}

const NUM_SPLITS = 20;
const INITIAL_MU = 1500;
const INITIAL_SIGMA_SQ = 350_000;

/**
 * Compute split-half reliability for CJ rankings.
 * Returns a value between 0 and 1 (Spearman rank correlation averaged over random splits).
 */
export function computeReliability(
  items: ItemRecord[],
  comparisons: ComparisonRecord[]
): number {
  if (items.length < 2 || comparisons.length < 4) return 0;

  let totalCorrelation = 0;

  for (let split = 0; split < NUM_SPLITS; split++) {
    // Shuffle comparisons and split in half
    const shuffled = [...comparisons].sort(() => Math.random() - 0.5);
    const mid = Math.floor(shuffled.length / 2);
    const halfA = shuffled.slice(0, mid);
    const halfB = shuffled.slice(mid);

    const rankingsA = runElo(items, halfA);
    const rankingsB = runElo(items, halfB);

    totalCorrelation += spearmanCorrelation(items, rankingsA, rankingsB);
  }

  return totalCorrelation / NUM_SPLITS;
}

function runElo(
  items: ItemRecord[],
  comparisons: ComparisonRecord[]
): Map<string, number> {
  const ratings = new Map<string, { mu: number; sigmaSq: number }>();
  for (const item of items) {
    ratings.set(item.id, { mu: INITIAL_MU, sigmaSq: INITIAL_SIGMA_SQ });
  }

  for (const c of comparisons) {
    const winner = ratings.get(c.winnerId);
    const loserId = c.winnerId === c.leftItemId ? c.rightItemId : c.leftItemId;
    const loser = ratings.get(loserId);
    if (!winner || !loser) continue;

    const result = updateRatings(winner, loser);
    ratings.set(c.winnerId, result.winner);
    ratings.set(loserId, result.loser);
  }

  const muMap = new Map<string, number>();
  for (const [id, r] of ratings) {
    muMap.set(id, r.mu);
  }
  return muMap;
}

function spearmanCorrelation(
  items: ItemRecord[],
  ratingsA: Map<string, number>,
  ratingsB: Map<string, number>
): number {
  const n = items.length;
  if (n < 2) return 0;

  const ranksA = computeRanks(items, ratingsA);
  const ranksB = computeRanks(items, ratingsB);

  let sumDSq = 0;
  for (const item of items) {
    const d = (ranksA.get(item.id) ?? 0) - (ranksB.get(item.id) ?? 0);
    sumDSq += d * d;
  }

  return 1 - (6 * sumDSq) / (n * (n * n - 1));
}

function computeRanks(
  items: ItemRecord[],
  ratings: Map<string, number>
): Map<string, number> {
  const sorted = [...items].sort(
    (a, b) => (ratings.get(b.id) ?? 0) - (ratings.get(a.id) ?? 0)
  );
  const ranks = new Map<string, number>();
  sorted.forEach((item, i) => ranks.set(item.id, i + 1));
  return ranks;
}
