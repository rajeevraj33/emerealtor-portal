"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { SORTS } from "@/lib/search";
import { PROPERTY_TYPES } from "@/lib/format";
import PriceFilter from "@/components/search/PriceFilter";

type NameSlug = { slug: string; name: string };

export default function FilterBar({ cities, neighbourhoods, activeCity }: { params?: Record<string, unknown>; cities: NameSlug[]; neighbourhoods: NameSlug[]; activeCity?: string }) {
  const router = useRouter();
  const sp = useSearchParams();
  const mode = sp.get("mode") === "Rent" ? "Rent" : "Sale";
  const sold = sp.get("status") === "Sold";
  const rented = sp.get("status") === "Rented";

  const update = useCallback((changes: Record<string, string | null>) => {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(changes)) {
      if (v == null || v === "") next.delete(k);
      else next.set(k, v);
    }
    if (!("poly" in changes)) next.delete("poly");
    router.push(`/search?${next.toString()}`);
  }, [router, sp]);

  const setMode = (m: "Sale" | "Rent" | "Sold" | "Rented") => {
    if (m === "Sold") update({ status: "Sold", mode: null });
    else if (m === "Rented") update({ status: "Rented", mode: "Rent" });
    else update({ status: null, mode: m });
  };

  const cur: "Sale" | "Rent" | "Sold" | "Rented" = sold ? "Sold" : rented ? "Rented" : mode;
  const activeNb = sp.get("neighbourhood");

  return (
    <div className="mx-auto max-w-7xl px-4 pb-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-full bg-gray-100 p-1 text-sm" role="group" aria-label="Listing type">
          {(["Sale", "Rent", "Sold", "Rented"] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)} className={`px-3 py-1.5 rounded-full ${cur === m ? "bg-brand text-[var(--brand-fg)]" : "text-gray-600 hover:text-gray-900"}`}>
              {m === "Sale" ? "For Sale" : m === "Rent" ? "For Rent" : m === "Sold" ? "Sold" : "Rented"}
            </button>
          ))}
        </div>

        <PriceFilter mode={mode} min={Number(sp.get("minPrice") || 0)} max={Number(sp.get("maxPrice") || 0)}
          onApply={(lo, hi) => update({ minPrice: lo ? String(lo) : null, maxPrice: hi ? String(hi) : null })} />
        <Select label="Beds" value={sp.get("beds") ?? ""} onChange={(v) => update({ beds: v })}
          options={[["", "Beds"], ["1", "1+"], ["2", "2+"], ["3", "3+"], ["4", "4+"], ["5", "5+"]]} />
        <Select label="Baths" value={sp.get("baths") ?? ""} onChange={(v) => update({ baths: v })}
          options={[["", "Baths"], ["1", "1+"], ["2", "2+"], ["3", "3+"], ["4", "4+"]]} />
        <Select label="Type" value={sp.get("type") ?? ""} onChange={(v) => update({ type: v })}
          options={[["", "All types"], ...PROPERTY_TYPES.map((t) => [t, t] as [string, string])]} />

        <div className="ml-auto">
          <Select label="Sort" value={sp.get("sort") ?? "newest"} onChange={(v) => update({ sort: v })}
            options={SORTS.map((s) => [s.key, s.label] as [string, string])} />
        </div>
      </div>

      {/* hierarchical chips: cities → (pick one) → its areas */}
      <div className="mt-2 flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {!activeCity ? (
          <>
            <Chip active onClick={() => {}}>All GTA</Chip>
            {cities.map((c) => <Chip key={c.slug} active={false} onClick={() => update({ city: c.slug, neighbourhood: null, location: null })}>{c.name}</Chip>)}
          </>
        ) : (
          <>
            <Chip active={false} onClick={() => update({ city: null, neighbourhood: null, location: null })}>← All GTA</Chip>
            <Chip active={!activeNb} onClick={() => update({ neighbourhood: null })}>All {cities.find((c) => c.slug === activeCity)?.name ?? "city"}</Chip>
            {neighbourhoods.map((n) => <Chip key={n.slug} active={activeNb === n.slug} onClick={() => update({ neighbourhood: n.slug })}>{n.name}</Chip>)}
          </>
        )}
      </div>
    </div>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <label className="text-sm">
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-gray-700 hover:border-gray-400">
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`shrink-0 rounded-full border px-3 py-1.5 text-sm ${active ? "border-brand bg-brand text-[var(--brand-fg)]" : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"}`}>
      {children}
    </button>
  );
}
