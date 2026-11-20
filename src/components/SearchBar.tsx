"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Suggest = {
  cities: { name: string; slug: string }[];
  areas: { name: string; slug: string; city: string }[];
  listings: { id: string; address: string; city: string; price: number; mode: string }[];
};

export default function SearchBar({ size = "lg", initial = "", mode }: { size?: "lg" | "sm"; initial?: string; mode?: string }) {
  const router = useRouter();
  const [q, setQ] = useState(initial);
  const [sug, setSug] = useState<Suggest | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const big = size === "lg";

  // Debounced typeahead fetch.
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setSug(null); setLoading(false); return; }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/suggest?q=${encodeURIComponent(term)}`);
        setSug(await r.json());
        setOpen(true);
      } catch { /* ignore */ } finally { setLoading(false); }
    }, 160);
    return () => clearTimeout(t);
  }, [q]);

  // Close on outside click.
  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const go = (href: string) => { setOpen(false); router.push(href); };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set("location", q.trim());
    if (mode) params.set("mode", mode);
    go(`/search?${params.toString()}`);
  };

  const hasResults = !!sug && (sug.cities.length > 0 || sug.areas.length > 0 || sug.listings.length > 0);

  return (
    <div ref={boxRef} className="relative w-full">
      <form onSubmit={submit} role="search" className="w-full">
        <div className={`flex items-center bg-white rounded-full shadow-lg ring-1 ring-black/5 ${big ? "p-1.5" : "p-1"}`}>
          <span className="pl-4 pr-2 text-gray-400" aria-hidden>🔍</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => { if (sug) setOpen(true); }}
            aria-label="Search by address, neighbourhood, MLS# or city"
            placeholder="Search by Address, Neighbourhood, MLS #, City"
            autoComplete="off"
            // inline style guarantees no focus outline regardless of CSS cascade layers
            style={{ outline: "none", boxShadow: "none" }}
            className={`flex-1 bg-transparent text-gray-800 placeholder-gray-400 ${big ? "py-3 text-base" : "py-2 text-sm"}`}
          />
          <button type="submit" className={`rounded-full bg-accent hover:bg-accent-600 text-white font-medium ${big ? "px-6 py-3" : "px-4 py-2 text-sm"}`}>
            Search
          </button>
        </div>
      </form>

      {open && q.trim().length >= 2 && (
        <div className="absolute z-50 mt-2 w-full rounded-2xl bg-white shadow-2xl ring-1 ring-black/10 overflow-hidden text-left max-h-[70vh] overflow-y-auto">
          {!hasResults && !loading && (
            <div className="px-4 py-3 text-sm text-gray-500">No matches for “{q.trim()}”. Press <strong>Search</strong> to browse all listings.</div>
          )}
          {loading && !hasResults && <div className="px-4 py-3 text-sm text-gray-400">Searching…</div>}

          {sug && (sug.cities.length > 0 || sug.areas.length > 0) && (
            <div className="py-1">
              <div className="px-4 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Areas</div>
              {sug.cities.map((c) => (
                <button type="button" key={`c-${c.slug}`} onClick={() => go(`/city/${c.slug}`)} className="w-full flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-gray-50">
                  <span className="text-gray-800 truncate">📍 {c.name}</span>
                  <span className="text-xs text-gray-400 shrink-0">City</span>
                </button>
              ))}
              {sug.areas.map((a) => (
                <button type="button" key={`a-${a.slug}`} onClick={() => go(`/neighbourhood/${a.slug}`)} className="w-full flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-gray-50">
                  <span className="text-gray-800 truncate">📍 {a.name}</span>
                  <span className="text-xs text-gray-400 shrink-0">{a.city}, ON</span>
                </button>
              ))}
            </div>
          )}

          {sug && sug.listings.length > 0 && (
            <div className="py-1 border-t border-gray-100">
              <div className="px-4 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Active Listings</div>
              {sug.listings.map((l) => (
                <button type="button" key={l.id} onClick={() => go(`/listing/${l.id}`)} className="w-full flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-gray-50">
                  <span className="text-gray-800 truncate">🏠 {l.address}</span>
                  <span className="text-xs text-gray-500 shrink-0">{l.city}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
