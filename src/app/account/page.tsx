import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import LogoutButton from "@/components/auth/LogoutButton";

export const metadata: Metadata = { title: "My Account" };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account");

  const [favCount, ssCount, consents] = await Promise.all([
    prisma.favourite.count({ where: { userId: user.id } }),
    prisma.savedSearch.count({ where: { userId: user.id } }),
    prisma.consent.findMany({ where: { userId: user.id }, orderBy: { grantedAt: "desc" } }),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome{user.name ? `, ${user.name.split(" ")[0]}` : ""}</h1>
          <p className="text-gray-500">{user.email}</p>
        </div>
        <div className="flex items-center gap-4">
          {user.role === "platform_admin" && <Link href="/platform" className="text-sm font-medium text-brand hover:underline">Platform Console →</Link>}
          {user.role === "brokerage_admin" && <Link href="/console" className="text-sm font-medium text-brand hover:underline">Brokerage Console →</Link>}
          {(user.role === "agent" || user.role === "team_lead") && <Link href="/agent" className="text-sm font-medium text-brand hover:underline">My Leads →</Link>}
          <LogoutButton />
        </div>
      </div>

      <div className="mt-6 grid sm:grid-cols-3 gap-4">
        <Link href="/account/favourites" className="rounded-xl ring-1 ring-black/10 p-5 hover:shadow-md">
          <div className="text-3xl font-bold text-brand">{favCount}</div><div className="text-sm text-gray-600">♥ Favourites</div>
        </Link>
        <Link href="/account/saved-searches" className="rounded-xl ring-1 ring-black/10 p-5 hover:shadow-md">
          <div className="text-3xl font-bold text-brand">{ssCount}</div><div className="text-sm text-gray-600">🔔 Saved searches &amp; alerts</div>
        </Link>
        <Link href="/compare" className="rounded-xl ring-1 ring-black/10 p-5 hover:shadow-md">
          <div className="text-3xl font-bold text-brand">⇄</div><div className="text-sm text-gray-600">Compare listings</div>
        </Link>
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Consent &amp; privacy (CASL / PIPEDA)</h2>
        <div className="rounded-xl ring-1 ring-black/10 divide-y text-sm">
          <div className="p-4 flex items-center justify-between">
            <span>VOW Terms of Use</span>
            <span className="text-green-700">Accepted {user.vowAcceptedAt ? new Date(user.vowAcceptedAt).toLocaleDateString("en-CA") : "—"}</span>
          </div>
          {consents.length === 0 && <div className="p-4 text-gray-500">No marketing consents on file.</div>}
          {consents.map((c) => (
            <div key={c.id} className="p-4 flex items-center justify-between">
              <span className="capitalize">{c.purpose} via {c.channel} <span className="text-xs text-gray-400">({c.type})</span></span>
              <span className={c.unsubscribedAt ? "text-gray-400" : "text-green-700"}>{c.unsubscribedAt ? "Unsubscribed" : `Consented ${new Date(c.grantedAt).toLocaleDateString("en-CA")}`}</span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-gray-400">You can withdraw consent at any time; alert emails include a one-click unsubscribe honoured within 10 business days (CASL).</p>
      </section>
    </div>
  );
}
