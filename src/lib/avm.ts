// Instant Estimate (AVM) — comparables-based heuristic over SOLD (VOW) data.
// This is NOT an appraisal; presented with a disclaimer (PRD §2.3.5 / §2.3.6).

export type Comp = { soldPrice: number; sqftMid: number; propertyType: string };

export type Estimate = { low: number; mid: number; high: number; confidence: "Low" | "Medium" | "High"; compCount: number };

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

const round1k = (n: number) => Math.round(n / 1000) * 1000;

export function estimate(targetSqftMid: number, listPrice: number | null, comps: Comp[]): Estimate | null {
  const usable = comps.filter((c) => c.sqftMid > 0 && c.soldPrice > 0);
  if (usable.length < 2) return null;
  const ppsf = median(usable.map((c) => c.soldPrice / c.sqftMid));
  let mid = ppsf * targetSqftMid;
  // anchor toward list price when available (reduces outlier swing)
  if (listPrice) mid = mid * 0.6 + listPrice * 0.4;
  const spread = usable.length >= 6 ? 0.05 : usable.length >= 4 ? 0.065 : 0.085;
  const confidence = usable.length >= 6 ? "High" : usable.length >= 3 ? "Medium" : "Low";
  return {
    mid: round1k(mid),
    low: round1k(mid * (1 - spread)),
    high: round1k(mid * (1 + spread)),
    confidence,
    compCount: usable.length,
  };
}
