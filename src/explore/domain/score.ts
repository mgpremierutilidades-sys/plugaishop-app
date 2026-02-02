export type ScoreInput = {
  popularity?: number;
  recencyDays?: number;
  price?: number;
};

export function computeScore(i: ScoreInput): number {
  const pop = Number.isFinite(i.popularity) ? (i.popularity as number) : 0;
  const rec = Number.isFinite(i.recencyDays) ? (i.recencyDays as number) : 999;
  const pr = Number.isFinite(i.price) ? (i.price as number) : 0;
  const recencyBoost = 1 / (1 + Math.max(0, rec));
  const pricePenalty = pr > 0 ? 1 / (1 + pr / 100) : 1;
  return pop * 0.7 + recencyBoost * 0.2 + pricePenalty * 0.1;
}
