import Link from "next/link";
import { getActiveTenant } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";

export default async function Footer() {
  const tenant = await getActiveTenant();
  const brokerage = await prisma.brokerage.findFirst({ where: { tenantId: tenant.id } });
  return (
    <footer className="mt-16 bg-black text-gray-400 text-sm">
      <div className="mx-auto max-w-7xl px-4 py-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="text-white font-semibold mb-2">{tenant.name}</div>
          <p className="text-gray-400 leading-relaxed">{tenant.tagline ?? "A Greater Toronto Area real-estate search experience."} Demo build on seed data.</p>
        </div>
        <div>
          <div className="text-white font-semibold mb-2">Search</div>
          <ul className="space-y-1.5 text-gray-400">
            <li><Link href="/search?mode=Sale" className="hover:text-white hover:underline">Homes for Sale</Link></li>
            <li><Link href="/search?mode=Rent" className="hover:text-white hover:underline">Homes for Rent</Link></li>
            <li><Link href="/search?status=Sold" className="hover:text-white hover:underline">Recently Sold</Link></li>
            <li><Link href="/search?status=Rented" className="hover:text-white hover:underline">Recently Rented</Link></li>
            <li><Link href="/neighbourhoods" className="hover:text-white hover:underline">Neighbourhoods</Link></li>
            <li><Link href="/agents" className="hover:text-white hover:underline">Find an Agent</Link></li>
          </ul>
        </div>
        <div>
          <div className="text-white font-semibold mb-2">Tools</div>
          <ul className="space-y-1.5 text-gray-400">
            <li><Link href="/home-estimator" className="hover:text-white hover:underline">Home Value Estimate</Link></li>
            <li><Link href="/mortgage" className="hover:text-white hover:underline">Mortgage Calculator</Link></li>
            <li><Link href="/mortgage#ltt-heading" className="hover:text-white hover:underline">Land Transfer Tax</Link></li>
            <li><Link href="/list-with-us" className="hover:text-white hover:underline">List your brokerage</Link></li>
          </ul>
        </div>
        <div>
          <div className="text-white font-semibold mb-2">Compliance</div>
          <ul className="space-y-1.5 text-gray-400">
            <li>MLS® &amp; REALTOR® trademarks owned by CREA.</li>
            <li>Data deemed reliable but not guaranteed.</li>
            <li><Link href="/account" className="hover:text-white hover:underline">Privacy &amp; consent</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-current/20">
        <div className="mx-auto max-w-7xl px-4 py-4 text-xs text-gray-400">
          © {new Date().getFullYear()} {brokerage?.legalName ?? tenant.name}. Demo — listing data is seeded sample content, not live MLS®. Sold &amp; price-history shown to registered users only (VOW).
        </div>
      </div>
    </footer>
  );
}
