import { Prisma } from "@prisma/client";

export const listingCardInclude = {
  canonicalProperty: true,
  neighbourhood: true,
  agent: true,
  media: { orderBy: { order: "asc" } as const },
} satisfies Prisma.ListingInclude;

export type ListingCard = Prisma.ListingGetPayload<{ include: typeof listingCardInclude }>;

export const listingFullInclude = {
  canonicalProperty: true,
  neighbourhood: { include: { schools: true } },
  agent: { include: { brokerage: true } },
  media: { orderBy: { order: "asc" } as const },
  priceEvents: { orderBy: { date: "asc" } as const },
} satisfies Prisma.ListingInclude;

export type ListingFull = Prisma.ListingGetPayload<{ include: typeof listingFullInclude }>;
