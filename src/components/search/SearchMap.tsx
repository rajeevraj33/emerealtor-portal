"use client";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet-draw";
import "leaflet-draw/dist/leaflet.draw.css";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { formatPriceShort } from "@/lib/format";

export type MapMarker = {
  id: string; lat: number; lng: number; price: number | null; isRent: boolean; sold: boolean;
  address: string; beds: number; baths: number; cover: string;
};

function priceIcon(m: MapMarker) {
  const label = m.price == null ? "🔒" : m.isRent ? `$${(m.price / 1000).toFixed(1)}k` : formatPriceShort(m.price);
  const bg = m.sold ? "#0f3d4c" : "#d6334b";
  return L.divIcon({
    className: "",
    html: `<div style="background:${bg};color:#fff;padding:3px 8px;border-radius:14px;font:600 12px system-ui;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,.35);transform:translate(-50%,-50%)">${label}</div>`,
    iconSize: [0, 0],
  });
}

function DrawTools() {
  const map = useMap();
  const router = useRouter();
  const sp = useSearchParams();
  useEffect(() => {
    const drawn = new L.FeatureGroup();
    map.addLayer(drawn);
    const ctrl = new L.Control.Draw({
      position: "topright",
      draw: { polygon: { shapeOptions: { color: "#d6334b" } }, rectangle: false, circle: false, marker: false, polyline: false, circlemarker: false },
      edit: { featureGroup: drawn, edit: false, remove: false },
    });
    map.addControl(ctrl);
    const created = L.Draw.Event.CREATED as string;
    const onCreated = (e: { layer: L.Polygon }) => {
      drawn.clearLayers();
      drawn.addLayer(e.layer);
      const ring = (e.layer.getLatLngs()[0] as L.LatLng[]).map((p) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`).join(";");
      const next = new URLSearchParams(sp.toString());
      next.set("poly", ring);
      router.push(`/search?${next.toString()}`);
    };
    map.on(created, onCreated as L.LeafletEventHandlerFn);
    return () => {
      map.off(created, onCreated as L.LeafletEventHandlerFn);
      map.removeControl(ctrl);
      map.removeLayer(drawn);
    };
  }, [map, router, sp]);
  return null;
}

function ClearArea() {
  const router = useRouter();
  const sp = useSearchParams();
  if (!sp.get("poly")) return null;
  const clear = () => {
    const next = new URLSearchParams(sp.toString());
    next.delete("poly");
    router.push(`/search?${next.toString()}`);
  };
  return (
    <button onClick={clear} className="absolute z-[1000] top-3 left-3 rounded-full bg-white shadow px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">
      ✕ Clear drawn area
    </button>
  );
}

export default function SearchMap({ markers, center }: { markers: MapMarker[]; center: { lat: number; lng: number } }) {
  return (
    <div className="relative h-full w-full">
      <ClearArea />
      <MapContainer center={[center.lat, center.lng]} zoom={12} scrollWheelZoom className="h-full w-full">
        <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <DrawTools />
        {markers.map((m) => (
          <Marker key={m.id} position={[m.lat, m.lng]} icon={priceIcon(m)}>
            <Popup>
              <a href={`/listing/${m.id}`} className="block w-44">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={m.cover} alt="" className="w-full h-24 object-cover rounded mb-1" />
                <div className="font-semibold text-gray-900">{m.price == null ? "Sign up to view" : m.isRent ? `${formatPriceShort(m.price)}/mo` : formatPriceShort(m.price)}</div>
                <div className="text-xs text-gray-600">{m.address}</div>
                <div className="text-xs text-gray-500">{m.beds} bed · {m.baths} bath</div>
              </a>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
