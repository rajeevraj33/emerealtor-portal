"use client";
import dynamic from "next/dynamic";
import { useState } from "react";
import type { MapMarker } from "./SearchMap";

const SearchMap = dynamic(() => import("./SearchMap"), {
  ssr: false,
  loading: () => <div className="h-full w-full grid place-items-center bg-brand-50 text-brand text-sm">Loading map…</div>,
});

type View = "List" | "Mixed" | "Map";

export default function SearchLayout({
  markers, center, children,
}: { markers: MapMarker[]; center: { lat: number; lng: number }; params: Record<string, unknown>; children: React.ReactNode }) {
  const [view, setView] = useState<View>("Mixed");

  return (
    <div>
      <div className="flex justify-end mb-3">
        <div className="inline-flex rounded-lg border border-gray-300 overflow-hidden text-sm" role="group" aria-label="View">
          {(["List", "Mixed", "Map"] as View[]).map((v) => (
            <button key={v} onClick={() => setView(v)}
              className={`px-3 py-1.5 ${view === v ? "bg-brand text-[var(--brand-fg)]" : "bg-white text-gray-600 hover:bg-gray-50"}`}>{v}</button>
          ))}
        </div>
      </div>

      {view === "List" && children}

      {view === "Mixed" && (
        <div className="grid lg:grid-cols-2 gap-5">
          <div className="order-2 lg:order-1">{children}</div>
          <div className="order-1 lg:order-2">
            <div className="lg:sticky lg:top-28 h-[50vh] lg:h-[calc(100vh-9rem)] rounded-xl overflow-hidden ring-1 ring-black/10">
              <SearchMap markers={markers} center={center} />
            </div>
          </div>
        </div>
      )}

      {view === "Map" && (
        <div className="h-[72vh] rounded-xl overflow-hidden ring-1 ring-black/10">
          <SearchMap markers={markers} center={center} />
        </div>
      )}
    </div>
  );
}
