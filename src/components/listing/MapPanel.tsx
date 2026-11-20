"use client";
import dynamic from "next/dynamic";

const MiniMap = dynamic(() => import("./MiniMap"), {
  ssr: false,
  loading: () => <div className="h-full w-full grid place-items-center bg-brand-50 text-brand text-sm">Loading map…</div>,
});

export default function MapPanel({ lat, lng, amenities }: { lat: number; lng: number; amenities: { label: string; count: number }[] }) {
  return (
    <div>
      <div className="h-72 rounded-xl overflow-hidden ring-1 ring-black/10"><MiniMap lat={lat} lng={lng} /></div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <a href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full bg-accent hover:bg-accent-600 text-white px-3 py-1.5 font-medium">
          📍 Get Directions
        </a>
        {amenities.map((a) => (
          <span key={a.label} className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-gray-700">
            <strong className="text-brand">{a.count}</strong> {a.label}
          </span>
        ))}
      </div>
    </div>
  );
}
