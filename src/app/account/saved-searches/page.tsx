import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import SavedSearchActions from "@/components/account/SavedSearchActions";

export const metadata: Metadata = { title: "Saved Searches & Alerts" };
export const dynamic = "force-dynamic";

function runHref(queryJson: string): string {
  try {
    const q = JSON.parse(queryJson) as Record<string, string>;
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(q)) if (v != null && v !== "") sp.set(k, String(v));
    return `/search?${sp.toString()}`;
  } catch {
    return "/search";
  }
}

export default async function SavedSearchesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account/saved-searches");

  const searches = await prisma.savedSearch.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-gray-900">Saved Searches &amp; Alerts</h1>
        <Link href="/account" className="text-sm text-brand hover:underline">← Account</Link>
      </div>

      {searches.length === 0 ? (
        <div className="py-16 text-center text-gray-500">
          <p className="font-medium text-gray-700">No saved searches yet.</p>
          <p className="mt-1 text-sm">Run a search and tap <strong>Get Alerts</strong> to save it and get notified of new matches.</p>
          <Link href="/search" className="mt-4 inline-block rounded-full bg-accent text-white px-5 py-2 text-sm">Start a search</Link>
        </div>
      ) : (
        <div className="rounded-xl ring-1 ring-black/10 divide-y">
          {searches.map((s) => (
            <div key={s.id} className="p-4 flex items-center justify-between gap-4">
              <div>
                <Link href={runHref(s.queryJson)} className="font-medium text-gray-900 hover:text-brand">{s.name}</Link>
                <div className="text-xs text-gray-500 mt-0.5">🔔 {s.alertFrequency} alerts via {s.channel} · saved {new Date(s.createdAt).toLocaleDateString("en-CA")}</div>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <Link href={runHref(s.queryJson)} className="text-sm text-brand hover:underline">Run</Link>
                <SavedSearchActions id={s.id} />
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="mt-3 text-xs text-gray-400">Alert emails are sent with your consent and include a one-click unsubscribe (CASL). This demo does not send real email.</p>
    </div>
  );
}
