const comparisons = 8;
export const significance = .05 / comparisons;

function binomial(n, p) {
  const weights = Array(n + 1).fill(0);
  if (p === 0 || p === 1) {
    weights[p * n] = 1;
    return weights;
  }
  const mode = Math.floor((n + 1) * p);
  weights[mode] = 1;
  for (let k = mode; k > 0; k--) weights[k - 1] = weights[k] * k / (n - k + 1) * (1 - p) / p;
  for (let k = mode; k < n; k++) weights[k + 1] = weights[k] * (n - k) / (k + 1) * p / (1 - p);
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  return weights.map(weight => weight / total);
}

function solveTail(tail, target) {
  let low = 0, high = 1;
  for (let i = 0; i < 48; i++) {
    const mid = (low + high) / 2;
    if (tail(mid) < target) low = mid;
    else high = mid;
  }
  return (low + high) / 2;
}

const sum = values => values.reduce((total, value) => total + value, 0);

export function exactProportion(label, count, n) {
  if (!n) return { label, n };
  const probabilities = binomial(n, .5);
  let tail = 0;
  const cumulative = probabilities.map(probability => (tail += probability));
  const twoSided = probabilities.map((_, k) => Math.min(1, 2 * cumulative[Math.min(k, n - k)]));
  const p = twoSided[count];
  const lower = count === 0 ? 0 : solveTail(candidate => sum(binomial(n, candidate).slice(count)), .025);
  const upper = count === n ? 1 : solveTail(candidate => sum(binomial(n, candidate).slice(count + 1)), .975);
  return {
    label, count, n, p, adjusted: Math.min(1, comparisons * p), estimate: count / n, lower, upper,
    nullBars: probabilities.map((probability, k) => ({ probability, reject: twoSided[k] <= significance }))
  };
}
