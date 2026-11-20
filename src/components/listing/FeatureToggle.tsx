"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

// Staff-only: spotlight a listing on the home page (the "Featured" badge).
export default function FeatureToggle({ listingId, initial }: { listingId: string; initial: boolean }) {
  const router = useRouter();
  const [on, setOn] = useState(initial);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    const res = await fetch(`/api/listings/${listingId}/feature`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ featured: !on }),
    });
    if (res.ok) { const d = await res.json(); setOn(d.isFeatured); router.refresh(); }
    setBusy(false);
  }

  return (
    <button onClick={toggle} disabled={busy} title="Staff: feature this listing on the home page"
      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm ${on ? "bg-accent text-white" : "ring-1 ring-gray-300 text-gray-700 hover:bg-gray-50"} disabled:opacity-60`}>
      {on ? "★ Featured" : "☆ Feature"}
    </button>
  );
}
