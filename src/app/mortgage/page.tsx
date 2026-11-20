import type { Metadata } from "next";
import MortgageCalculator, { LttCalculator } from "@/components/mortgage/MortgageCalculator";

export const metadata: Metadata = {
  title: "Mortgage & Land Transfer Tax Calculator",
  description: "Canadian mortgage payment calculator with semi-annual compounding, B-20 stress test, CMHC insurance, and stacked Ontario + Toronto land transfer tax.",
};

export default function MortgagePage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-bold text-gray-900">Mortgage Calculator</h1>
      <p className="mt-2 text-gray-600">Canadian mortgage math — semi-annual compounding, the B-20 stress test, and CMHC insurance for down payments under 20%.</p>
      <div className="mt-8"><MortgageCalculator /></div>

      <h2 className="mt-14 text-2xl font-bold text-gray-900" id="ltt-heading">Land Transfer Tax</h2>
      <p className="mt-2 text-gray-600">Ontario LTT — plus the City of Toronto&apos;s municipal LTT if you buy in Toronto — with first-time buyer rebates.</p>
      <div className="mt-6"><LttCalculator /></div>
    </div>
  );
}
