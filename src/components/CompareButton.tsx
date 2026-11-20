"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const KEY = "eme_compare";

function read(): string[] {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}

export default function CompareButton({ listingId, variant = "button" }: { listingId: string; variant?: "button" | "chip" }) {
  const router = useRouter();
  const [on, setOn] = useState(false);
  useEffect(() => { setOn(read().includes(listingId)); }, [listingId]);

  function toggle() {
    const cur = read();
    const next = cur.includes(listingId) ? cur.filter((x) => x !== listingId) : [...cur, listingId].slice(-4);
    localStorage.setItem(KEY, JSON.stringify(next));
    setOn(next.includes(listingId));
    window.dispatchEvent(new Event("compare-change"));
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button onClick={toggle} className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm ${on ? "bg-brand text-[var(--brand-fg)]" : "ring-1 ring-gray-300 text-gray-700 hover:bg-gray-50"}`}>
        ⇄ {on ? "Comparing" : "Compare"}
      </button>
      {variant === "button" && <button onClick={() => router.push("/compare")} className="text-sm text-brand hover:underline">View compare</button>}
    </span>
  );
}
