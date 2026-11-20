import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import Estimator from "@/components/estimator/Estimator";

export const metadata: Metadata = {
  title: "Home Value Estimate",
  description: "Get an instant, AI-assisted estimate of your GTA home's value with a High / Mid / Low range based on recent comparable sales.",
};
export const dynamic = "force-dynamic";

export default async function HomeEstimatorPage() {
  const neighbourhoods = await prisma.neighbourhood.findMany({ orderBy: { name: "asc" }, select: { slug: true, name: true } });
  return (
    <div>
      {/* Hero */}
      <section className="bg-gray-50 border-b border-gray-100">
        <div className="mx-auto max-w-5xl px-4 py-12 text-center">
          <div className="mx-auto max-w-sm space-y-2 mb-8">
            <div className="rounded-md bg-accent text-white text-sm font-semibold px-4 py-2 flex justify-between"><span>High</span><span>$$$</span></div>
            <div className="rounded-md bg-accent/90 text-white text-sm font-semibold px-4 py-2 flex justify-between mx-auto w-[82%]"><span>Mid</span><span>$$</span></div>
            <div className="rounded-md bg-accent/80 text-white text-sm font-semibold px-4 py-2 flex justify-between mx-auto w-[64%]"><span>Low</span><span>$</span></div>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">Get an Instant Home Value Estimate for your Property</h1>
          <p className="mt-4 text-gray-600 leading-relaxed max-w-2xl mx-auto">
            Instantly estimate your home&apos;s value with the Hunt property Home Value Estimator — a tool that leverages AI and recent comparable sales to help you make informed real-estate decisions, whether you&apos;re buying, selling, or investing.
          </p>
          <p className="mt-3 text-gray-600">Simply enter your property details below and receive an estimate.</p>
        </div>
      </section>

      {/* Estimator tool */}
      <section className="mx-auto max-w-5xl px-4 py-10">
        <Estimator neighbourhoods={neighbourhoods} />
      </section>

      {/* How we calculate */}
      <section className="bg-gray-50 border-y border-gray-100">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="text-center text-2xl sm:text-3xl font-semibold text-gray-900 mb-10">How We Calculate Your Property Value</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <HowCard icon="🏠" title="Intelligent Property Valuation" body="Our AI-assisted tool estimates your property's value by analyzing your home's details, recent market trends, historical pricing, and comparable properties in your vicinity." />
            <HowCard icon="📈" title="Receive a Precise Estimate" body="You'll quickly receive a High / Mid / Low estimate range. If you're interested in buying or selling, you can connect with a qualified real-estate agent." />
            <HowCard icon="🤝" title="Connect With Your Agent" body="Need more information or a more accurate valuation? Our experienced agents are ready to assist you — connect with us today for any details you need to feel confident." />
          </div>
        </div>
      </section>

      {/* Selling CTA + FAQ */}
      <section className="mx-auto max-w-6xl px-4 py-14 grid lg:grid-cols-2 gap-10 items-start">
        <div className="rounded-xl bg-brand-50 p-8">
          <div className="text-4xl" aria-hidden>🤝</div>
          <h3 className="mt-4 text-xl font-semibold text-gray-900">Selling your property? Increase your home value with our experts.</h3>
          <p className="mt-3 text-gray-600">Our team specializes in local GTA markets and can help you price and market your property to get the best price.</p>
          <Link href="/agents" className="mt-5 inline-block rounded-md bg-accent hover:bg-accent-600 text-white font-medium px-5 py-2.5">Connect with an agent</Link>
        </div>
        <div>
          <h3 className="text-2xl font-semibold text-gray-900 mb-4">FAQs and additional resources</h3>
          <Faq q="How much can I get for my property?" a="Your property value depends on location, size, amenities, and market trends. Use the estimator above for an instant range, or contact one of our agents for a professional comparative market analysis." />
          <Faq q="How do I know if my home is priced right?" a="A comparative market analysis (CMA) from a local agent compares your home to recent comparable sales nearby and reflects current demand — request one from any agent profile." />
          <Faq q="Is the estimate an official appraisal?" a="No. This automated estimate is for informational purposes only and is generated from comparable sales. For lending or legal purposes, a professional appraisal is required." />
        </div>
      </section>
    </div>
  );
}

function HowCard({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div className="text-center">
      <div className="mx-auto w-16 h-16 grid place-items-center rounded-full bg-brand-50 text-3xl" aria-hidden>{icon}</div>
      <h3 className="mt-4 font-semibold text-gray-900">{title}</h3>
      <p className="mt-2 text-sm text-gray-600 leading-relaxed">{body}</p>
    </div>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <details className="border-l-2 border-gray-200 hover:border-accent pl-4 py-3 group">
      <summary className="cursor-pointer list-none font-medium text-gray-900 flex items-center justify-between">
        {q}<span className="text-gray-400 group-open:rotate-180 transition-transform">▾</span>
      </summary>
      <p className="mt-2 text-sm text-gray-600 leading-relaxed">{a}</p>
    </details>
  );
}
