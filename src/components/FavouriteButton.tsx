"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function FavouriteButton({ listingId, initial = false, className = "" }: { listingId: string; initial?: boolean; className?: string }) {
  const router = useRouter();
  const [fav, setFav] = useState(initial);
  const [busy, setBusy] = useState(false);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    const res = await fetch("/api/favourites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId }),
    });
    if (res.status === 401) {
      router.push(`/signup?next=${encodeURIComponent(location.pathname)}`);
      return;
    }
    const data = await res.json().catch(() => ({}));
    setFav(!!data.favourited);
    setBusy(false);
  }

  return (
    <button
      onClick={toggle}
      aria-pressed={fav}
      aria-label={fav ? "Remove from favourites" : "Add to favourites"}
      className={`grid place-items-center rounded-full bg-white/90 hover:bg-white shadow w-9 h-9 text-lg leading-none ${className}`}
    >
      <span className={fav ? "text-accent" : "text-gray-400"}>{fav ? "♥" : "♡"}</span>
    </button>
  );
}
