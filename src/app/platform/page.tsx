import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { formatPrice, timeAgo } from "@/lib/format";
import TenantActions from "@/components/platform/TenantActions";
import AddClientForm from "@/components/platform/AddClientForm";

export const metadata: Metadata = { title: "Platform Console" };
export const dynamic = "force-dynamic";

export default async function PlatformPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/platform");
  if (user.role !== "platform_admin") redirect("/account");

  const tenants = await prisma.tenant.findMany({
    orderBy: { isDefault: "desc" },
    include: {
      subscription: true, domains: true,
      _count: { select: { agents: true, leads: true } },
      users: { where: { role: "brokerage_admin" }, select: { id: true }, take: 1 },
    },
  });
  const [listingCount, leadTotal, audit] = await Promise.all([
    prisma.listing.count(),
    prisma.lead.count(),
    prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 12, include: { actor: { select: { name: true, email: true } } } }),
  ]);
  const mrr = tenants.reduce((s, t) => s + (t.subscription ? t.subscription.pricePerSeat * t.subscription.seats : 0), 0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Platform Console</h1>
        <Link href="/list-with-us" className="text-sm rounded-full bg-accent text-white px-4 py-2 hover:bg-accent-600">+ Onboard brokerage</Link>
      </div>

      <div className="mt-5 grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Stat label="Tenants" value={String(tenants.length)} />
        <Stat label="MRR (pre-tax)" value={`${formatPrice(mrr)}`} />
        <Stat label="Total leads" value={String(leadTotal)} />
        <Stat label="Shared listings" value={String(listingCount)} />
        <Stat label="Active" value={String(tenants.filter((t) => t.status === "active").length)} />
      </div>

      <div className="mt-8 mb-2 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-900">Tenants (clients)</h2>
        <AddClientForm />
      </div>
      <div className="overflow-x-auto rounded-xl ring-1 ring-black/10">
        <table className="w-full text-sm min-w-[840px]">
          <thead className="bg-gray-50 text-gray-500 text-left"><tr><th className="p-3">Brokerage</th><th className="p-3">Plan</th><th className="p-3">Seats</th><th className="p-3">Agents</th><th className="p-3">Leads</th><th className="p-3">Domain</th><th className="p-3">Status</th><th className="p-3 text-right">Actions</th></tr></thead>
          <tbody className="divide-y">
            {tenants.map((t) => (
              <tr key={t.id}>
                <td className="p-3"><div className="font-medium text-gray-900">{t.name}</div><div className="text-xs text-gray-500">{t.subdomain}.app · {t.slug}</div></td>
                <td className="p-3 capitalize">{t.subscription?.plan ?? t.plan}</td>
                <td className="p-3">{t.subscription?.seats ?? "—"}</td>
                <td className="p-3">{t._count.agents}</td>
                <td className="p-3">{t._count.leads}</td>
                <td className="p-3 text-xs text-gray-500">{t.domains.find((d) => d.isPrimary)?.host ?? "—"}</td>
                <td className="p-3"><span className={`rounded-full px-2 py-0.5 text-xs capitalize ${t.status === "active" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>{t.status}</span></td>
                <td className="p-3"><TenantActions tenantId={t.id} adminUserId={t.users[0]?.id} status={t.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mt-8 mb-2 text-lg font-semibold text-gray-900">Audit log</h2>
      <div className="rounded-xl ring-1 ring-black/10 divide-y text-sm">
        {audit.length === 0 && <div className="p-4 text-gray-500">No admin actions yet.</div>}
        {audit.map((a) => (
          <div key={a.id} className="p-3 flex items-center justify-between">
            <span><span className="font-medium text-gray-900">{a.action}</span> {a.target && <span className="text-gray-500">→ {a.target}</span>} {a.detail && <span className="text-gray-400">({a.detail})</span>}</span>
            <span className="text-xs text-gray-400">{a.actor?.name ?? a.actor?.email ?? "system"} · {timeAgo(a.createdAt)}</span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-gray-400">Impersonation and tenant actions are recorded here (compliance: audited cross-tenant access).</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl ring-1 ring-black/5 p-4 bg-white"><div className="text-2xl font-bold text-gray-900">{value}</div><div className="text-xs text-gray-500">{label}</div></div>;
}
