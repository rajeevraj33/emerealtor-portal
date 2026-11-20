"use client";
import { usePathname } from "next/navigation";

// On the home page the header is a transparent overlay so the hero image shows
// through the full top (no header bar). On every other page it's a solid black
// bar. White text either way.
export default function HeaderShell({ children }: { children: React.ReactNode }) {
  const isHome = usePathname() === "/";
  return (
    <header
      className={
        isHome
          ? "absolute inset-x-0 top-0 z-40 text-white"
          : "sticky top-0 z-40 bg-black text-white"
      }
    >
      <div className="mx-auto max-w-7xl px-4 h-16 flex items-center gap-6">{children}</div>
    </header>
  );
}
