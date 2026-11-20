// Canadian mortgage + closing-cost math (PRD §2.3.10).
// Fixed-rate mortgages use SEMI-ANNUAL compounding (federal Interest Act) — not US monthly.

/** Convert a nominal annual rate (semi-annually compounded) to an effective monthly rate. */
export function monthlyRateSemiAnnual(annualRatePct: number): number {
  const semi = annualRatePct / 100 / 2;
  return Math.pow(1 + semi, 1 / 6) - 1;
}

export function monthlyPayment(principal: number, annualRatePct: number, amortYears: number): number {
  const i = monthlyRateSemiAnnual(annualRatePct);
  const n = amortYears * 12;
  if (i === 0) return principal / n;
  return (principal * i) / (1 - Math.pow(1 + i, -n));
}

/** Minimum down payment under Canadian rules: 5% to $500k, 10% on the portion $500k–$1M, 20% at $1M+. */
export function minDownPayment(price: number): number {
  if (price >= 1_000_000) return price * 0.2;
  if (price <= 500_000) return price * 0.05;
  return 500_000 * 0.05 + (price - 500_000) * 0.1;
}

/** CMHC mortgage-default-insurance premium rate by loan-to-value (down-payment %). Homes ≥ $1M are uninsurable. */
export function cmhcPremiumRate(price: number, downPct: number): number {
  if (price >= 1_000_000) return 0; // must put 20% down; uninsurable
  if (downPct >= 20) return 0;
  if (downPct >= 15) return 0.028;
  if (downPct >= 10) return 0.031;
  if (downPct >= 5) return 0.04;
  return 0; // below legal minimum
}

/** B-20 stress test: qualify at the greater of contract rate + 2% or 5.25%. */
export function stressTestRate(contractRatePct: number): number {
  return Math.max(contractRatePct + 2, 5.25);
}

function marginal(price: number, brackets: [number, number, number][]): number {
  // brackets: [lower, upper, rate]
  let tax = 0;
  for (const [lo, hi, rate] of brackets) {
    if (price > lo) tax += (Math.min(price, hi) - lo) * rate;
  }
  return Math.round(tax);
}

const ONTARIO_BRACKETS: [number, number, number][] = [
  [0, 55_000, 0.005],
  [55_000, 250_000, 0.01],
  [250_000, 400_000, 0.015],
  [400_000, 2_000_000, 0.02],
  [2_000_000, Infinity, 0.025],
];

// City of Toronto Municipal LTT — mirrors the provincial schedule with added luxury tiers (2024+/2026).
const TORONTO_BRACKETS: [number, number, number][] = [
  [0, 55_000, 0.005],
  [55_000, 250_000, 0.01],
  [250_000, 400_000, 0.015],
  [400_000, 2_000_000, 0.02],
  [2_000_000, 3_000_000, 0.025],
  [3_000_000, 4_000_000, 0.035],
  [4_000_000, 5_000_000, 0.045],
  [5_000_000, Infinity, 0.055],
];

export function ontarioLTT(price: number): number {
  return marginal(price, ONTARIO_BRACKETS);
}
export function torontoLTT(price: number): number {
  return marginal(price, TORONTO_BRACKETS);
}

export const FIRST_TIME_REBATE = { ontario: 4000, toronto: 4475 };

export type LttResult = {
  ontario: number;
  toronto: number;
  total: number;
  rebate: number;
  net: number;
};

export function landTransferTax(price: number, inToronto: boolean, firstTime: boolean): LttResult {
  const ontario = ontarioLTT(price);
  const toronto = inToronto ? torontoLTT(price) : 0;
  const total = ontario + toronto;
  const rebate = firstTime ? Math.min(ontario, FIRST_TIME_REBATE.ontario) + (inToronto ? Math.min(toronto, FIRST_TIME_REBATE.toronto) : 0) : 0;
  return { ontario, toronto, total, rebate, net: Math.max(0, total - rebate) };
}
