"use client";
import { useState } from "react";

export default function ShareButton() {
  const [copied, setCopied] = useState(false);
  async function share() {
    const url = location.href;
    if (navigator.share) { try { await navigator.share({ url }); return; } catch { /* cancelled */ } }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <button onClick={share} className="inline-flex items-center gap-1.5 rounded-md ring-1 ring-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">
      ↗ {copied ? "Link copied" : "Share"}
    </button>
  );
}
