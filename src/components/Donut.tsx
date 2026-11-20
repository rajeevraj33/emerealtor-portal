export type Segment = { label: string; value: number; color: string };

// Pure-SVG donut chart (population by age, etc.).
export default function Donut({ segments, centerTop, centerMain, size = 180, stroke = 30 }: { segments: Segment[]; centerTop?: string; centerMain?: string; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img" aria-label="Age distribution donut chart">
      <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#eee" strokeWidth={stroke} />
        {segments.map((s, i) => {
          const len = (c * s.value) / 100;
          const el = (
            <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.color} strokeWidth={stroke}
              strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset} />
          );
          offset += len;
          return el;
        })}
      </g>
      {centerTop && <text x="50%" y="46%" textAnchor="middle" fontSize="11" fill="#9ca3af">{centerTop}</text>}
      {centerMain && <text x="50%" y="58%" textAnchor="middle" fontSize="18" fontWeight="700" fill="#374151">{centerMain}</text>}
    </svg>
  );
}
