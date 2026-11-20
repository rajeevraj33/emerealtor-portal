import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { formatPrice } from "@/lib/format";
import { canadianTax } from "@/lib/tax";
import BillingControls from "@/components/billing/BillingControls";

export const metadata: Metadata = { title: "Billing" };
export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/console/billing");
  if (user.role !== "brokerage_admin" && user.role !== "platform_admin") redirect("/account");

  const sub = await prisma.subscription.findUnique({ where: { tenantId: user.tenantId } });
  const tenant = await prisma.tenant.findUnique({ where: { id: user.tenantId } });
  if (!sub) redirect("/console");

  const subtotal = sub.seats * sub.pricePerSeat;
  const tax = canadianTax(sub.province, subtotal);
  const periodEnd = sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString("en-CA") : "—";

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold text-gray-900">Billing — {tenant?.name}</h1>
        <Link href="/console" className="text-sm text-brand hover:underline">← Console</Link>
      </div>
      <p className="text-sm text-gray-500 mb-6">{sub.status === "trialing" ? `Free trial — renews ${periodEnd}` : `Active — next invoice ${periodEnd}`}</p>

      <BillingControls plan={sub.plan} seats={sub.seats} province={sub.province} pricePerSeat={sub.pricePerSeat} status={sub.status} />

      <h2 className="mt-10 mb-2 text-lg font-semibold text-gray-900">Invoices</h2>
      <div className="rounded-xl ring-1 ring-black/10 divide-y text-sm">
        <div className="p-3 flex items-center justify-between">
          <div><div className="font-medium text-gray-900">Current period</div><div className="text-xs text-gray-500">{sub.seats} seats · {tax.label} {sub.province}</div></div>
          <div className="text-right"><div className="font-semibold">{formatPrice(tax.total)}</div><div className="text-xs text-gray-400 capitalize">{sub.status === "trialing" ? "trial" : "due " + periodEnd}</div></div>
        </div>
        <div className="p-3 text-xs text-gray-400">Past invoices appear here once the first payment is processed. (Demo — no real charges.)</div>
      </div>
      <p className="mt-2 text-xs text-gray-400">Merchant of record &amp; tax remittance handled by the platform via Stripe Tax in production; GST/HST registration required past $30,000 CAD / 12 months.</p>
    </div>
  );
}
