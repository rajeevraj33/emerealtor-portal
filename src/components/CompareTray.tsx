"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const KEY = "eme_compare";

export default function CompareTray() {
  const router = useRouter();
  const [count, setCount] = useState(0);

  useEffect(() => {
    const read = () => {
      try { setCount((JSON.parse(localStorage.getItem(KEY) || "[]") as string[]).length); } catch { setCount(0); }
    };
    read();
    window.addEventListener("compare-change", read);
    window.addEventListener("storage", read);
    return () => { window.removeEventListener("compare-change", read); window.removeEventListener("storage", read); };
  }, []);

  if (count === 0) return null;

  function clear() {
    localStorage.setItem(KEY, "[]");
    window.dispatchEvent(new Event("compare-change"));
  }

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[1000]">
      <div className="flex items-center gap-3 rounded-full bg-brand text-[var(--brand-fg)] shadow-lg pl-5 pr-2 py-2">
        <span className="text-sm font-medium">⇄ {count} selected to compare{count >= 4 ? " (max)" : ""}</span>
        <button onClick={() => router.push("/compare")} className="rounded-full bg-white text-brand text-sm font-semibold px-4 py-1.5 hover:bg-gray-100">Compare</button>
        <button onClick={clear} aria-label="Clear compare" className="text-[var(--brand-fg-soft)] hover:text-[var(--brand-fg)] px-1">✕</button>
      </div>
    </div>
  );
}
