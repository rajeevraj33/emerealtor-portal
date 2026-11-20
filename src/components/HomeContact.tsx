import { prisma } from "@/lib/prisma";
import HomeContactForm from "./HomeContactForm";

// Homepage "Work with Ruchi Bansal" section — her photo + a direct contact form.
export default async function HomeContact() {
  const ruchi = await prisma.agent.findFirst({ where: { name: "Ruchi Bansal" }, include: { brokerage: true } });
  if (!ruchi) return null;
  const photo = ruchi.photoUrl ?? `/api/photo?seed=${encodeURIComponent(ruchi.name)}&kind=agent`;

  return (
    <section className="bg-brand-50 border-t border-gray-100">
      <div className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid items-center gap-8 md:grid-cols-2">
          {/* Ruchi */}
          <div className="flex flex-col items-center text-center md:items-start md:text-left">
            <div className="h-56 w-56 overflow-hidden rounded-2xl bg-gray-100 ring-1 ring-black/5 shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo} alt={ruchi.name} className="h-full w-full object-cover" />
            </div>
            <h2 className="mt-5 text-2xl font-bold text-gray-900">{ruchi.name}</h2>
            <p className="text-sm text-gray-500">{ruchi.title ?? "Sales Representative"}</p>
            {ruchi.brokerage && <p className="text-sm text-gray-500">{ruchi.brokerage.tradeName ?? ruchi.brokerage.legalName}</p>}
            <div className="mt-3 space-y-1 text-sm text-gray-700">
              {ruchi.phone && <div>📞 <a href={`tel:${ruchi.phone}`} className="hover:text-accent">{ruchi.phone}</a></div>}
              {ruchi.email && <div>✉️ <a href={`mailto:${ruchi.email}`} className="hover:text-accent">{ruchi.email}</a></div>}
            </div>
          </div>

          {/* Contact form */}
          <div className="rounded-2xl bg-white p-6 sm:p-8 ring-1 ring-black/5 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900">Get in touch with {ruchi.name.split(" ")[0]}</h3>
            <p className="mt-1 mb-4 text-sm text-gray-500">Buying, selling or just exploring the GTA market? Send a note and {ruchi.name.split(" ")[0]} will reach out.</p>
            <HomeContactForm agentId={ruchi.id} agentName={ruchi.name} />
          </div>
        </div>
      </div>
    </section>
  );
}
