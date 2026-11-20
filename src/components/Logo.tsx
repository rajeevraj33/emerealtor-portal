// Tenant-aware brand mark: a hexagon "chip" + two-tone wordmark.
// The last word of the name is accented (e.g. "EME" white + "Realtor" mint),
// so a future rebrand only needs the tenant `name` + `hex` to change.
export default function Logo({
  name,
  initial,
  hex,
  onLight = false,
  size = 38,
}: {
  name: string;
  initial: string;
  hex: string;
  onLight?: boolean;
  size?: number;
}) {
  const parts = name.trim().split(/\s+/);
  const hasTwo = parts.length > 1;
  const first = hasTwo ? parts.slice(0, -1).join(" ") : parts[0];
  const last = hasTwo ? parts[parts.length - 1] : "";
  // Mint hexagon mark (matches the brand logo); the wordmark flips to dark on a
  // light brand surface so it stays legible (uniform colour, like the logo).
  const wordColor = onLight ? "#111827" : "#ffffff";

  return (
    <span className="inline-flex items-center gap-2.5">
      <svg width={size} height={size} viewBox="0 0 40 44" className="block shrink-0" aria-hidden="true">
        <polygon points="20,2 38,12.5 38,31.5 20,42 2,31.5 2,12.5" fill={hex} stroke={onLight ? "rgba(17,24,39,0.14)" : "none"} />
        <text
          x="20"
          y="23"
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
          fontWeight="800"
          fontSize="23"
          fill="#0b1220"
        >
          {initial}
        </text>
      </svg>
      <span className="hidden sm:inline font-mono font-extrabold tracking-tight text-lg leading-none whitespace-nowrap" style={{ color: wordColor }}>
        {first}{last && ` ${last}`}
      </span>
    </span>
  );
}
