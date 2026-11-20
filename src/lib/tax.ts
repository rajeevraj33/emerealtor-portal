// Canadian sales tax on SaaS subscriptions (PRD §3.8). Rates by province of supply.
const TAX: Record<string, { label: string; rate: number }> = {
  ON: { label: "HST", rate: 0.13 },
  NB: { label: "HST", rate: 0.15 }, NL: { label: "HST", rate: 0.15 }, NS: { label: "HST", rate: 0.15 }, PE: { label: "HST", rate: 0.15 },
  BC: { label: "GST+PST", rate: 0.12 }, MB: { label: "GST+PST", rate: 0.12 }, SK: { label: "GST+PST", rate: 0.11 },
  QC: { label: "GST+QST", rate: 0.14975 },
  AB: { label: "GST", rate: 0.05 }, NT: { label: "GST", rate: 0.05 }, NU: { label: "GST", rate: 0.05 }, YT: { label: "GST", rate: 0.05 },
};

export const PROVINCES = Object.keys(TAX);

export function canadianTax(province: string, amount: number) {
  const t = TAX[province] ?? TAX.ON;
  const tax = Math.round(amount * t.rate * 100) / 100;
  return { label: t.label, rate: t.rate, tax, total: Math.round((amount + tax) * 100) / 100 };
}

export const GST_REGISTRATION_THRESHOLD = 30000; // CAD revenue / 12 months
