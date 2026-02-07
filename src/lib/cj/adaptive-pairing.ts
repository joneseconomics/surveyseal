export interface PairCandidate {
  id: string;
  mu: number;
  sigmaSq: number;
}

export interface SelectedPair {
  left: PairCandidate;
  right: PairCandidate;
  infoGain: number;
}

function canonicalKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

export function computeInfoGain(i: PairCandidate, j: PairCandidate): number {
  const totalSigmaSq = i.sigmaSq + j.sigmaSq;
  if (totalSigmaSq === 0) return 0;
  const muDiff = i.mu - j.mu;
  return totalSigmaSq * Math.exp(-(muDiff * muDiff) / (2 * totalSigmaSq));
}

/**
 * Select the next pair with the highest expected information gain
 * that this judge hasn't already compared.
 */
export function selectNextPair(
  items: PairCandidate[],
  comparedPairKeys: Set<string>
): SelectedPair | null {
  if (items.length < 2) return null;

  let best: SelectedPair | null = null;

  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const key = canonicalKey(items[i].id, items[j].id);
      if (comparedPairKeys.has(key)) continue;

      const gain = computeInfoGain(items[i], items[j]);
      if (!best || gain > best.infoGain) {
        best = { left: items[i], right: items[j], infoGain: gain };
      }
    }
  }

  return best;
}

/**
 * Build a set of canonical pair keys from session comparisons.
 */
export function buildComparedPairKeys(
  comparisons: Array<{ leftItemId: string; rightItemId: string }>
): Set<string> {
  const keys = new Set<string>();
  for (const c of comparisons) {
    keys.add(canonicalKey(c.leftItemId, c.rightItemId));
  }
  return keys;
}
