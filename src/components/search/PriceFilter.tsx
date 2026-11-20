"use client";
import { useEffect, useRef, useState } from "react";
import { formatPriceShort } from "@/lib/format";

// Dual-thumb price range slider in a "Price" popover (replaces the min/max dropdowns).
export default function PriceFilter({ mode, min, max, onApply }: {
  mode: "Sale" | "Rent";
  min: number;
  max: number;
  onApply: (min: number | null, max: number | null) => void;
}) {
  const isRent = mode === "Rent";
  const MAX = isRent ? 8000 : 3000000;
  const STEP = isRent ? 100 : 25000;
  const [open, setOpen] = useState(false);
  const [lo, setLo] = useState(min || 0);
  const [hi, setHi] = useState(max || MAX);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setLo(min || 0); setHi(max || MAX); }, [min, max, MAX]);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const label = (!min && !max) ? "Price" : `${min ? formatPriceShort(min) : "Any"} – ${max ? formatPriceShort(max) : "Any"}`;
  const apply = () => { onApply(lo > 0 ? lo : null, hi < MAX ? hi : null); setOpen(false); };
  const clear = () => { setLo(0); setHi(MAX); onApply(null, null); setOpen(false); };
  const loPct = (lo / MAX) * 100;
  const hiPct = (hi / MAX) * 100;

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)}
        className={`rounded-full border px-3 py-1.5 text-sm inline-flex items-center gap-1 ${min || max ? "border-brand bg-brand-50 text-brand" : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"}`}>
        {label} <span className="text-gray-400">▾</span>
      </button>
      {open && (
        <div className="absolute z-50 mt-2 w-72 rounded-xl bg-white shadow-2xl ring-1 ring-black/10 p-4">
          <div className="flex items-center justify-between text-sm font-semibold text-gray-900 mb-3">
            <span>{lo > 0 ? formatPriceShort(lo) : "$0"}</span>
            <span>{hi < MAX ? formatPriceShort(hi) : `${formatPriceShort(MAX)}+`}</span>
          </div>
          <div className="relative h-6">
            <div className="absolute top-1/2 -translate-y-1/2 h-1 w-full rounded bg-gray-200" />
            <div className="absolute top-1/2 -translate-y-1/2 h-1 rounded bg-brand" style={{ left: `${loPct}%`, right: `${100 - hiPct}%` }} />
            <input type="range" min={0} max={MAX} step={STEP} value={lo} aria-label="Minimum price"
              onChange={(e) => setLo(Math.min(Number(e.target.value), hi - STEP))}
              className="dual-range absolute w-full top-0 h-6" style={{ pointerEvents: "none" }} />
            <input type="range" min={0} max={MAX} step={STEP} value={hi} aria-label="Maximum price"
              onChange={(e) => setHi(Math.max(Number(e.target.value), lo + STEP))}
              className="dual-range absolute w-full top-0 h-6" style={{ pointerEvents: "none" }} />
          </div>
          <div className="mt-5 flex items-center justify-between">
            <button type="button" onClick={clear} className="text-sm text-gray-500 hover:text-gray-800">Clear</button>
            <button type="button" onClick={apply} className="rounded-md bg-accent hover:bg-accent-600 text-white text-sm font-medium px-4 py-1.5">Apply</button>
          </div>
        </div>
      )}
    </div>
  );
}
