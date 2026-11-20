"use client";
import { useRouter } from "next/navigation";

export default function ExitImpersonation() {
  const router = useRouter();
  async function exit() {
    await fetch("/api/platform/impersonate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "exit" }) });
    router.push("/platform");
    router.refresh();
  }
  return <button onClick={exit} className="rounded bg-amber-950 text-amber-50 px-3 py-1 text-xs font-medium hover:bg-amber-900">Exit impersonation</button>;
}
