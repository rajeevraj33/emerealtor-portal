import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import Domains from "@/components/billing/Domains";

export const metadata: Metadata = { title: "Domains" };
export const dynamic = "force-dynamic";

export default async function DomainsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/console/domains");
  if (user.role !== "brokerage_admin" && user.role !== "platform_admin") redirect("/account");

  const tenant = await prisma.tenant.findUnique({ where: { id: user.tenantId } });
  const domains = await prisma.domain.findMany({ where: { tenantId: user.tenantId }, orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] });

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold text-gray-900">White-label domains</h1>
        <Link href="/console" className="text-sm text-brand hover:underline">← Console</Link>
      </div>
      <p className="text-sm text-gray-500 mb-6">Run {tenant?.name} on your own domain with automatic HTTPS. Your platform subdomain <strong>{tenant?.subdomain}.emeinfotech.app</strong> always works.</p>
      <Domains domains={domains} />
    </div>
  );
}
