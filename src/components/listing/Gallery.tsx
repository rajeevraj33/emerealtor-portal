"use client";
import Link from "next/link";
import { useState } from "react";

type Media = { url: string; isVowGated: boolean };

export default function Gallery({ media, canViewVow, totalCount, next }: { media: Media[]; canViewVow: boolean; totalCount: number; next: string }) {
  const [open, setOpen] = useState<number | null>(null);
  const visible = media.map((m) => ({ ...m, locked: m.isVowGated && !canViewVow }));
  const cover = visible[0];
  const side = visible.slice(1, 3);
  const lockedCount = visible.filter((v) => v.locked).length;

  return (
    <div className="relative overflow-hidden rounded-xl">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 h-[260px] sm:h-[420px]">
        <button onClick={() => !cover?.locked && setOpen(0)} className="relative overflow-hidden rounded-l-xl group min-h-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cover?.url} alt="Listing cover photo" className="absolute inset-0 w-full h-full object-cover" />
        </button>
        <div className="hidden sm:grid grid-rows-2 gap-1.5 min-h-0">
          {side.map((m, i) => (
            <div key={i} className="relative overflow-hidden last:rounded-tr-xl min-h-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={m.url} alt="" className={`absolute inset-0 w-full h-full object-cover ${m.locked ? "blur-md scale-105" : ""}`} />
              {m.locked && <div className="absolute inset-0 bg-brand/40 grid place-items-center text-white text-2xl">🔒</div>}
            </div>
          ))}
        </div>
      </div>

      {/* photo count / gate */}
      <div className="absolute bottom-3 right-3">
        {canViewVow ? (
          <button onClick={() => setOpen(0)} className="rounded-lg bg-white/90 hover:bg-white px-3 py-1.5 text-sm font-medium text-gray-800 shadow">
            📷 View {totalCount === 1 ? "photo" : `all ${totalCount} photos`}
          </button>
        ) : (
          <Link href={`/signup?next=${encodeURIComponent(next)}`} className="rounded-lg bg-accent hover:bg-accent-600 px-3 py-1.5 text-sm font-medium text-white shadow">
            🔒 Create an account to view {totalCount === 1 ? "photo" : `all ${totalCount} photos`}
          </Link>
        )}
      </div>

      {open !== null && (
        <div className="fixed inset-0 z-[1100] bg-black/90 grid place-items-center p-4" onClick={() => setOpen(null)}>
          <div className="max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={visible.filter((v) => !v.locked)[open]?.url} alt="" className="w-full max-h-[80vh] object-contain rounded" />
            <div className="mt-3 flex items-center justify-between text-white">
              <button onClick={() => setOpen((o) => Math.max(0, (o ?? 0) - 1))} className="px-4 py-2 rounded bg-white/10 hover:bg-white/20">← Prev</button>
              <span className="text-sm">{(open ?? 0) + 1} / {visible.filter((v) => !v.locked).length}{!canViewVow && ` (${lockedCount} more after sign-up)`}</span>
              <button onClick={() => setOpen((o) => Math.min(visible.filter((v) => !v.locked).length - 1, (o ?? 0) + 1))} className="px-4 py-2 rounded bg-white/10 hover:bg-white/20">Next →</button>
            </div>
            <button onClick={() => setOpen(null)} className="absolute top-4 right-4 text-white text-2xl">✕</button>
          </div>
        </div>
      )}
    </div>
  );
}
