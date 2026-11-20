"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SavedSearchActions({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function del() {
    if (busy) return;
    setBusy(true);
    await fetch(`/api/saved-searches?id=${id}`, { method: "DELETE" });
    router.refresh();
  }
  return (
    <button onClick={del} disabled={busy} className="text-sm text-gray-400 hover:text-accent">{busy ? "…" : "Delete"}</button>
  );
}
