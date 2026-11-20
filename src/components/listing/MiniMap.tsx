"use client";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";

const pin = L.divIcon({
  className: "",
  html: `<div style="width:18px;height:18px;border-radius:50%;background:#d6334b;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4);transform:translate(-50%,-50%)"></div>`,
  iconSize: [0, 0],
});

export default function MiniMap({ lat, lng }: { lat: number; lng: number }) {
  return (
    <MapContainer center={[lat, lng]} zoom={14} scrollWheelZoom={false} className="h-full w-full">
      <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Marker position={[lat, lng]} icon={pin} />
    </MapContainer>
  );
}
