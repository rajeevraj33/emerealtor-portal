"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

// Header "Neighbourhoods" mega-dropdown: GTA cities → city pages (each lists its areas).
export default function NavNeighbourhoods({ cities }: { cities: { name: string; slug: string; nbCount: number }[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div ref={ref} className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button className="px-3 py-2 rounded hover:bg-white/10 inline-flex items-center gap-1" aria-expanded={open}>
        Neighbourhoods <span className="text-[10px] opacity-70">▾</span>
      </button>
      {open && (
        <div className="absolute left-0 top-full pt-2 z-50">
          <div className="w-[440px] rounded-xl bg-white shadow-2xl ring-1 ring-black/10 p-3">
            <div className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Explore by city</div>
            <div className="grid grid-cols-2 gap-0.5">
              {cities.map((c) => (
                <Link key={c.slug} href={`/city/${c.slug}`} onClick={() => setOpen(false)}
                  className="flex items-center justify-between px-3 py-2 rounded hover:bg-gray-50 text-gray-800">
                  <span className="font-medium text-sm">{c.name}</span>
                  <span className="text-xs text-gray-400">{c.nbCount} areas</span>
                </Link>
              ))}
            </div>
            <Link href="/neighbourhoods" onClick={() => setOpen(false)}
              className="mt-2 block px-3 py-2 text-sm text-brand hover:underline border-t border-gray-100 pt-3">
              Browse all neighbourhoods →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
