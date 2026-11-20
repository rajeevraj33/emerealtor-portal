import { formatPriceShort } from "@/lib/format";

type Point = { month: Date; avgSoldPrice: number; salesCount: number };

// Pure-SVG dual-axis chart: monthly sales volume (bars) + average sold price (line).
export default function MarketChart({ series }: { series: Point[] }) {
  if (series.length < 2) return null;
  const W = 900, H = 320, mL = 56, mR = 48, mT = 16, mB = 34;
  const pw = W - mL - mR, ph = H - mT - mB;

  const prices = series.map((s) => s.avgSoldPrice);
  const sales = series.map((s) => s.salesCount);
  const pMin = Math.min(...prices) * 0.88, pMax = Math.max(...prices) * 1.04;
  const sMax = Math.max(...sales) * 1.15;

  const x = (i: number) => mL + (pw * i) / (series.length - 1);
  const yP = (v: number) => mT + ph * (1 - (v - pMin) / (pMax - pMin));
  const yS = (v: number) => mT + ph * (1 - v / sMax);
  const barW = Math.max(2, (pw / series.length) * 0.62);

  const linePts = series.map((s, i) => `${x(i).toFixed(1)},${yP(s.avgSoldPrice).toFixed(1)}`).join(" ");
  const priceTicks = 4, salesTicks = 4;

  return (
    <div className="w-full overflow-hidden">
      <div className="flex items-center gap-4 text-xs text-gray-500 mb-1">
        <span className="inline-flex items-center gap-1"><span className="inline-block w-3 h-3 bg-gray-300 rounded-sm" /> Number of Sales</span>
        <span className="inline-flex items-center gap-1"><span className="inline-block w-3 h-1 rounded-full" style={{ background: "var(--color-accent)" }} /> Avg. Sold Price</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Sales volume and average price over time">
        {/* gridlines + left (price) axis */}
        {Array.from({ length: priceTicks + 1 }, (_, k) => {
          const v = pMin + ((pMax - pMin) * k) / priceTicks;
          const y = yP(v);
          return (
            <g key={`p${k}`}>
              <line x1={mL} y1={y} x2={W - mR} y2={y} stroke="#eee" />
              <text x={mL - 6} y={y + 3} textAnchor="end" fontSize="10" fill="#9ca3af">{formatPriceShort(v)}</text>
            </g>
          );
        })}
        {/* right (sales) axis */}
        {Array.from({ length: salesTicks + 1 }, (_, k) => {
          const v = (sMax * k) / salesTicks;
          return <text key={`s${k}`} x={W - mR + 6} y={yS(v) + 3} textAnchor="start" fontSize="10" fill="#9ca3af">{Math.round(v)}</text>;
        })}
        {/* bars */}
        {series.map((s, i) => (
          <rect key={i} x={x(i) - barW / 2} y={yS(s.salesCount)} width={barW} height={mT + ph - yS(s.salesCount)} fill="#d1d5db" rx="1" />
        ))}
        {/* price line + dots */}
        <polyline points={linePts} fill="none" style={{ stroke: "var(--color-accent)" }} strokeWidth="2" />
        {series.map((s, i) => (i % 3 === 0 ? <circle key={i} cx={x(i)} cy={yP(s.avgSoldPrice)} r="2.5" style={{ fill: "var(--color-accent)" }} /> : null))}
        {/* year labels */}
        {series.map((s, i) => {
          const d = new Date(s.month);
          if (d.getMonth() !== 0) return null;
          return <text key={`y${i}`} x={x(i)} y={H - 12} textAnchor="middle" fontSize="11" fill="#6b7280">{d.getFullYear()}</text>;
        })}
      </svg>
    </div>
  );
}
