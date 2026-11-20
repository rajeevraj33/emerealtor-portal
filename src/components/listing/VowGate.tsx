import Link from "next/link";

export default function VowGate({ title, next }: { title: string; next: string }) {
  return (
    <div className="rounded-xl border border-dashed border-brand/30 bg-brand-50 p-6">
      <div className="flex items-start gap-3">
        <span className="text-2xl">🔒</span>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <ul className="mt-2 text-sm text-gray-600 space-y-1">
            <li>• <strong>Sold &amp; rented data</strong> — see what nearby homes actually sold for.</li>
            <li>• <strong>Full photo galleries</strong> and price history.</li>
            <li>• <strong>Listing alerts</strong> the moment a matching home hits the market.</li>
          </ul>
          <p className="mt-2 text-[11px] text-gray-500">Sold prices and price history are <strong>VOW</strong> data — under TRREB rules they may only be shown to a registered user who has accepted the VOW Terms of Use.</p>
          <div className="mt-3 flex gap-2">
            <Link href={`/signup?next=${encodeURIComponent(next)}`} className="rounded-md bg-accent hover:bg-accent-600 text-white text-sm font-medium px-4 py-2">Create an account</Link>
            <Link href={`/login?next=${encodeURIComponent(next)}`} className="rounded-md bg-white ring-1 ring-gray-300 hover:bg-gray-50 text-sm px-4 py-2">Log in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
