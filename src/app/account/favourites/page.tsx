import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, canViewVow } from "@/lib/session";
import { listingCardInclude } from "@/lib/queries";
import ListingCard from "@/components/ListingCard";

export const metadata: Metadata = { title: "My Favourites" };
export const dynamic = "force-dynamic";

export default async function FavouritesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account/favourites");
  const vow = canViewVow(user);

  const favs = await prisma.favourite.findMany({
    where: { userId: user.id }, orderBy: { createdAt: "desc" },
    include: { listing: { include: listingCardInclude } },
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-gray-900">My Favourites</h1>
        <Link href="/account" className="text-sm text-brand hover:underline">← Account</Link>
      </div>
      {favs.length === 0 ? (
        <div className="py-16 text-center text-gray-500">
          <p className="font-medium text-gray-700">No favourites yet.</p>
          <p className="mt-1 text-sm">Tap the ♥ on any listing to save it here.</p>
          <Link href="/search" className="mt-4 inline-block rounded-full bg-accent text-white px-5 py-2 text-sm">Browse listings</Link>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {favs.map((f) => <ListingCard key={f.id} listing={f.listing} canViewVow={vow} isFav />)}
        </div>
      )}
    </div>
  );
}
