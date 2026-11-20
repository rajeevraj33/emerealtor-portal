import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function mulberry32(seed: number) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20260617);
const pick = <T>(arr: T[]) => arr[Math.floor(rnd() * arr.length)];
const between = (a: number, b: number) => Math.round(a + rnd() * (b - a));
const frnd = (a: number, b: number) => a + rnd() * (b - a);
const daysAgo = (n: number) => new Date(Date.now() - n * 86400000);
const hrsFromNow = (n: number) => new Date(Date.now() + n * 3600000);
const photo = (seed: string, kind: string) => `/api/photo?seed=${encodeURIComponent(seed)}&kind=${kind}&v=5`;
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const round1k = (n: number) => Math.round(n / 1000) * 1000;

// ---------------- Tenants / agents (unchanged 2-tenant SaaS) ----------------
const REGIONS = ["west", "central", "east"];
type AgentCfg = { name: string; phone: string; team: number; lead?: boolean; region: string };
const TENANTS = [
  {
    slug: "emeinfotech", name: "Hunt property", tagline: "GTA homes, made simple.", emailDomain: "emeinfotech.ai",
    brand: { brandColor: "#000000", brandColor700: "#000000", brandColor50: "#f3f4f6", accentColor: "#2196f3" }, logoText: "H",
    subdomain: "emerealtor", plan: "brokerage", isDefault: true, status: "active",
    brokerage: { legalName: "Right At Home", tradeName: "Right At Home", bor: "R. Bansal", recoId: "REG-4410022", routing: "round-robin" },
    teams: ["Downtown Team", "West Team"], adminEmail: "admin@emeinfotech.ai",
    agents: <AgentCfg[]>[
      { name: "Rahul Sudan", phone: "647-492-5508", team: 0, lead: true, region: "central" },
      { name: "Daniel Okafor", phone: "416-883-2207", team: 0, region: "central" },
      { name: "Carlos Mendez", phone: "647-330-9912", team: 0, region: "east" },
      { name: "Ruchi Bansal", phone: "+1 647-629-9225", team: 1, lead: true, region: "west" },
      { name: "Mei Lin Chen", phone: "905-855-7781", team: 1, region: "west" },
      { name: "Aisha Rahman", phone: "905-491-3360", team: 1, region: "central" },
    ],
    subscription: { plan: "brokerage", seats: 8, pricePerSeat: 99, province: "ON", status: "active", periodDays: 18 },
    domains: [{ host: "emeinfotech.localhost", primary: true, verified: true, ssl: "issued" }, { host: "www.emeinfotech.ca", primary: false, verified: false, ssl: "pending" }],
    ownsListings: true,
  },
  {
    slug: "maple", name: "Maple Realty Group", tagline: "Your trusted GTA team.", emailDomain: "maplerealty.ca",
    brand: { brandColor: "#14532d", brandColor700: "#0b3d20", brandColor50: "#e8f3ec", accentColor: "#d97706" }, logoText: "M",
    subdomain: "maple", plan: "team", isDefault: false, status: "active",
    brokerage: { legalName: "Maple Realty Group Ltd., Brokerage", tradeName: "Maple Realty", bor: "A. Tremblay", recoId: "REG-5582910", routing: "first-to-claim" },
    teams: ["Maple Team"], adminEmail: "admin@maplerealty.ca",
    agents: <AgentCfg[]>[
      { name: "Olivia Tremblay", phone: "905-271-7788", team: 0, lead: true, region: "west" },
      { name: "Noah Patel", phone: "416-555-2231", team: 0, region: "central" },
      { name: "Emma Wong", phone: "647-555-9043", team: 0, region: "east" },
      { name: "Liam Garcia", phone: "905-555-1180", team: 0, region: "central" },
    ],
    subscription: { plan: "team", seats: 4, pricePerSeat: 99, province: "ON", status: "trialing", periodDays: 9 },
    domains: [{ host: "maple.localhost", primary: true, verified: true, ssl: "issued" }],
    ownsListings: false,
  },
];

// ---------------- Greater Toronto Area: cities → neighbourhoods ----------------
type City = { name: string; slug: string; lat: number; lng: number; tier: number; vol: number; hoods: string[] };
const CITIES: City[] = [
  { name: "Toronto", slug: "toronto", lat: 43.6532, lng: -79.3832, tier: 1180000, vol: 1700, hoods: ["Downtown Core", "Liberty Village", "Leslieville", "The Annex", "Yorkville", "The Beaches", "High Park", "Riverdale", "Forest Hill", "Danforth", "The Junction", "North York Centre", "Scarborough Bluffs", "Etobicoke Shores"] },
  { name: "Mississauga", slug: "mississauga", lat: 43.589, lng: -79.644, tier: 1100000, vol: 760, hoods: ["Airport Corporate", "Applewood", "Central Erin Mills", "Churchill Meadows", "Clarkson", "Cooksville", "Creditview", "Dixie", "Downtown Mississauga", "East Credit", "Erindale", "Erin Mills", "Fairview", "Gateway", "Hurontario", "Lakeview", "Lisgar", "Lorne Park", "Malton", "Mavis-Erindale", "Meadowvale", "Meadowvale Business Park", "Meadowvale Village", "Mineola", "Mississauga Valleys", "Northeast", "Port Credit", "Rathwood", "Sheridan", "Southdown", "Streetsville"] },
  { name: "Brampton", slug: "brampton", lat: 43.7315, lng: -79.7624, tier: 1050000, vol: 480, hoods: ["Bramalea", "Springdale", "Heart Lake", "Mount Pleasant", "Castlemore", "Fletcher's Meadow", "Credit Valley", "Sandringham"] },
  { name: "Oakville", slug: "oakville", lat: 43.4675, lng: -79.6877, tier: 1520000, vol: 260, hoods: ["Glen Abbey", "Bronte", "Old Oakville", "Uptown Core", "River Oaks", "Joshua Creek", "Westmount"] },
  { name: "Vaughan", slug: "vaughan", lat: 43.8361, lng: -79.4983, tier: 1430000, vol: 360, hoods: ["Woodbridge", "Maple", "Thornhill Woods", "Kleinburg", "Vellore Village", "Patterson"] },
  { name: "Markham", slug: "markham", lat: 43.8561, lng: -79.337, tier: 1400000, vol: 340, hoods: ["Unionville", "Markham Village", "Cornell", "Berczy", "Cathedraltown", "Milliken Mills", "Wismer"] },
  { name: "Richmond Hill", slug: "richmond-hill", lat: 43.8828, lng: -79.4403, tier: 1450000, vol: 240, hoods: ["Oak Ridges", "Bayview Hill", "Mill Pond", "Jefferson", "Observatory", "Westbrook"] },
  { name: "Milton", slug: "milton", lat: 43.5183, lng: -79.8774, tier: 1090000, vol: 180, hoods: ["Beaty", "Dempsey", "Scott", "Willmott", "Old Milton", "Ford"] },
  { name: "Burlington", slug: "burlington", lat: 43.3255, lng: -79.799, tier: 1180000, vol: 230, hoods: ["Aldershot", "Brant Hills", "Millcroft", "Roseland", "Alton Village", "The Orchard"] },
  { name: "Pickering", slug: "pickering", lat: 43.8384, lng: -79.0868, tier: 1010000, vol: 150, hoods: ["Bay Ridges", "Amberlea", "Liverpool", "Rosebank", "Highbush"] },
  { name: "Ajax", slug: "ajax", lat: 43.8509, lng: -79.0204, tier: 960000, vol: 160, hoods: ["Pickering Village", "Southwood", "Applecroft", "Nottingham", "Central Ajax"] },
  { name: "Oshawa", slug: "oshawa", lat: 43.8971, lng: -78.8658, tier: 850000, vol: 220, hoods: ["Downtown Oshawa", "Samac", "Windfields", "Donevan", "Lakeview", "Kedron"] },
];

const TYPES = ["Detached", "Semi-Detached", "Townhouse", "Condo Apt", "Condo Townhouse"];
const STREETS = ["Maple", "Birchwood", "Carding Mill", "Hensall", "Fieldgate", "Constitution", "Havenwood", "Branigan", "Lakeshore", "Pinetree", "Glen", "Tenth Line", "Britannia", "Eglinton", "Burnhamthorpe", "Dundas", "Credit Valley", "Erin Centre", "Thomas", "Battleford", "Sterling", "Roxton", "Oakfield", "Brunswick", "Bayview", "Yonge", "Bloor", "Queen", "King", "Bathurst"];
const SUFFIX = ["Drive", "Crescent", "Court", "Avenue", "Boulevard", "Road", "Place", "Gate", "Trail", "Way", "Street", "Lane"];
const BROKERAGES = ["EME Realtor Realty Inc., Brokerage", "Royal LePage Real Estate Services Ltd.", "RE/MAX Realtron Realty Inc.", "Century 21 Leading Edge Realty", "Keller Williams Advantage Realty", "Sutton Group Quantum Realty", "Bosley Real Estate Ltd."];
const PHOTO_KINDS = ["ext", "living", "kitchen", "bed", "bath", "dining"];
const LEAD_NAMES = ["Jordan Lee", "Sara Kim", "Mohammed Ali", "Grace Liu", "Tom Becker", "Nina Costa", "Raj Mehta", "Chloe Dubois", "Victor Nguyen", "Hana Suzuki", "Owen Clarke", "Maya Singh"];
const SEASON = [0.78, 0.82, 1.05, 1.18, 1.26, 1.2, 1.05, 0.95, 1.0, 1.02, 0.9, 0.72]; // Jan..Dec

// Real Statistics Canada 2021 Census data per GTA city: population, median age,
// median total household income, and age distribution (%). Source: StatsCan 2021
// Census Profiles (Census Subdivisions). Drives the neighbourhood demographics.
const CITY_CENSUS: Record<string, { population: number; medianAge: number; medianIncome: number; age: Record<string, number> }> = {
  toronto:         { population: 2794356, medianAge: 39, medianIncome: 84000,  age: { "0-14": 14, "15-19": 5, "20-34": 24, "35-49": 23, "50-64": 19, "65+": 15 } },
  mississauga:     { population: 717961,  medianAge: 40, medianIncome: 102000, age: { "0-14": 16, "15-19": 6, "20-34": 20, "35-49": 21, "50-64": 21, "65+": 16 } },
  brampton:        { population: 656480,  medianAge: 36, medianIncome: 111000, age: { "0-14": 19, "15-19": 7, "20-34": 22, "35-49": 22, "50-64": 19, "65+": 11 } },
  markham:         { population: 338503,  medianAge: 42, medianIncome: 104000, age: { "0-14": 15, "15-19": 6, "20-34": 18, "35-49": 21, "50-64": 22, "65+": 18 } },
  vaughan:         { population: 323103,  medianAge: 41, medianIncome: 124000, age: { "0-14": 16, "15-19": 7, "20-34": 18, "35-49": 21, "50-64": 22, "65+": 16 } },
  "richmond-hill": { population: 202022,  medianAge: 42, medianIncome: 102000, age: { "0-14": 15, "15-19": 6, "20-34": 18, "35-49": 20, "50-64": 22, "65+": 19 } },
  oakville:        { population: 213759,  medianAge: 42, medianIncome: 128000, age: { "0-14": 17, "15-19": 7, "20-34": 15, "35-49": 21, "50-64": 22, "65+": 18 } },
  burlington:      { population: 186948,  medianAge: 44, medianIncome: 106000, age: { "0-14": 15, "15-19": 6, "20-34": 16, "35-49": 19, "50-64": 23, "65+": 21 } },
  oshawa:          { population: 175383,  medianAge: 39, medianIncome: 86000,  age: { "0-14": 16, "15-19": 6, "20-34": 21, "35-49": 20, "50-64": 20, "65+": 17 } },
  milton:          { population: 132979,  medianAge: 36, medianIncome: 126000, age: { "0-14": 21, "15-19": 7, "20-34": 18, "35-49": 24, "50-64": 18, "65+": 12 } },
  ajax:            { population: 126666,  medianAge: 38, medianIncome: 119000, age: { "0-14": 18, "15-19": 7, "20-34": 19, "35-49": 21, "50-64": 20, "65+": 15 } },
  pickering:       { population: 99186,   medianAge: 42, medianIncome: 118000, age: { "0-14": 15, "15-19": 7, "20-34": 17, "35-49": 20, "50-64": 23, "65+": 18 } },
};

function priceFor(type: string, mode: string, tier: number): number {
  if (mode === "Rent") {
    const base = tier / 1100000;
    if (type === "Condo Apt") return round1k(between(2100, 3300) * base);
    if (type.includes("Townhouse") || type === "Semi-Detached") return round1k(between(2900, 4200) * base);
    return round1k(between(3500, 5600) * base);
  }
  switch (type) {
    case "Detached": return round1k(tier * frnd(1.05, 1.95));
    case "Semi-Detached": return round1k(tier * frnd(0.82, 1.15));
    case "Townhouse": return round1k(tier * frnd(0.72, 1.0));
    case "Condo Townhouse": return round1k(tier * frnd(0.65, 0.92));
    default: return round1k(tier * frnd(0.4, 0.78));
  }
}

async function main() {
  console.log("Resetting…");
  for (const fn of [
    () => prisma.leadEvent.deleteMany(), () => prisma.booking.deleteMany(), () => prisma.lead.deleteMany(),
    () => prisma.savedSearch.deleteMany(), () => prisma.favourite.deleteMany(), () => prisma.priceEvent.deleteMany(),
    () => prisma.listingMedia.deleteMany(), () => prisma.listing.deleteMany(), () => prisma.canonicalProperty.deleteMany(),
    () => prisma.school.deleteMany(), () => prisma.neighbourhood.deleteMany(), () => prisma.marketStat.deleteMany(),
    () => prisma.consent.deleteMany(), () => prisma.vowAcceptance.deleteMany(), () => prisma.domain.deleteMany(),
    () => prisma.subscription.deleteMany(), () => prisma.auditLog.deleteMany(), () => prisma.agent.deleteMany(),
    () => prisma.team.deleteMany(), () => prisma.brokerage.deleteMany(), () => prisma.user.deleteMany(), () => prisma.tenant.deleteMany(),
  ]) await fn();

  // ---- Tenants / agents ----
  let listingOwners: { id: string; region: string }[] = [];
  const tenantSummaries: { slug: string; id: string; routing: string; agents: { id: string; name: string; region: string }[] }[] = [];
  for (const t of TENANTS) {
    const tenant = await prisma.tenant.create({ data: { slug: t.slug, name: t.name, tagline: t.tagline, ...t.brand, logoText: t.logoText, subdomain: t.subdomain, plan: t.plan, isDefault: t.isDefault, status: t.status } });
    const brokerage = await prisma.brokerage.create({ data: { tenantId: tenant.id, legalName: t.brokerage.legalName, tradeName: t.brokerage.tradeName, brokerOfRecord: t.brokerage.bor, recoId: t.brokerage.recoId, routingStrategy: t.brokerage.routing } });
    const teams = [] as { id: string }[];
    for (const tn of t.teams) teams.push(await prisma.team.create({ data: { tenantId: tenant.id, brokerageId: brokerage.id, name: tn } }));
    await prisma.user.create({ data: { tenantId: tenant.id, email: t.adminEmail, passwordHash: await bcrypt.hash("admin123", 10), name: `${t.brokerage.tradeName} Admin`, role: "brokerage_admin", emailVerified: true, vowAcceptedAt: new Date() } });
    const agents = [] as { id: string; name: string; region: string }[];
    for (const a of t.agents) {
      const first = a.name.split(" ")[0].toLowerCase();
      const email = `${first}@${t.emailDomain}`;
      const aUser = await prisma.user.create({ data: { tenantId: tenant.id, email, passwordHash: await bcrypt.hash("agent123", 10), name: a.name, role: a.lead ? "team_lead" : "agent", emailVerified: true, vowAcceptedAt: new Date() } });
      const agent = await prisma.agent.create({ data: { tenantId: tenant.id, brokerageId: brokerage.id, teamId: teams[a.team]?.id, userId: aUser.id, name: a.name, phone: a.phone, email, photoUrl: photo(a.name, "agent"), bio: `${a.name} serves the ${a.region} GTA with ${t.brokerage.tradeName}.`, region: a.region, isTeamLead: !!a.lead, recoVerified: true } });
      agents.push({ id: agent.id, name: a.name, region: a.region });
    }
    if (t.ownsListings) listingOwners = agents.map((a) => ({ id: a.id, region: a.region }));
    await prisma.subscription.create({ data: { tenantId: tenant.id, plan: t.subscription.plan, seats: t.subscription.seats, pricePerSeat: t.subscription.pricePerSeat, province: t.subscription.province, status: t.subscription.status, currentPeriodEnd: new Date(Date.now() + t.subscription.periodDays * 86400000) } });
    for (const d of t.domains) await prisma.domain.create({ data: { tenantId: tenant.id, host: d.host, isPrimary: d.primary, verified: d.verified, sslStatus: d.ssl } });
    tenantSummaries.push({ slug: t.slug, id: tenant.id, routing: t.brokerage.routing, agents });
  }
  const defaultTenant = await prisma.tenant.findFirst({ where: { isDefault: true } });
  await prisma.user.create({ data: { tenantId: defaultTenant!.id, email: "platform@emeinfotech.ai", passwordHash: await bcrypt.hash("platform123", 10), name: "Platform Admin", role: "platform_admin", emailVerified: true, vowAcceptedAt: new Date() } });
  const demo = await prisma.user.create({ data: { tenantId: defaultTenant!.id, email: "demo@emeinfotech.ai", passwordHash: await bcrypt.hash("password123", 10), name: "Demo User", role: "consumer", emailVerified: true, vowAcceptedAt: new Date() } });
  await prisma.vowAcceptance.create({ data: { tenantId: defaultTenant!.id, userId: demo.id } });
  await prisma.consent.create({ data: { tenantId: defaultTenant!.id, userId: demo.id, type: "express", channel: "email", purpose: "alert", source: "seed" } });

  // ---- Cities → neighbourhoods → listings, + monthly market stats ----
  let nbCount = 0, listingCount = 0, mls = 13100000;
  for (const city of CITIES) {
    // monthly market aggregates (4 years)
    for (let m = 0; m < 48; m++) {
      const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(1); d.setMonth(d.getMonth() - (47 - m));
      const mi = d.getMonth();
      const trend = 0.85 + 0.0033 * m;
      const avgSold = round1k(city.tier * trend * (0.97 + (SEASON[mi] - 1) * 0.05) * frnd(0.96, 1.04));
      const sales = Math.max(20, Math.round(city.vol * SEASON[mi] * frnd(0.85, 1.18)));
      const avgRent = round1k(city.tier / 440 * (0.9 + 0.0028 * m) * frnd(0.97, 1.04));
      await prisma.marketStat.create({ data: { citySlug: city.slug, city: city.name, month: d, avgSoldPrice: avgSold, salesCount: sales, avgRentPrice: avgRent, rentCount: Math.round(sales * frnd(1.4, 2.6)) } });
    }

    for (const hood of city.hoods) {
      const nbSlug = `${city.slug}-${slugify(hood)}`;
      const lat = city.lat + frnd(-0.04, 0.04), lng = city.lng + frnd(-0.05, 0.05);
      const walk = between(40, 88), transit = between(36, 86), bike = between(42, 68);
      const cen = CITY_CENSUS[city.slug] ?? CITY_CENSUS.mississauga;
      const nb = await prisma.neighbourhood.create({
        data: {
          slug: nbSlug, name: hood, city: city.name, citySlug: city.slug, lat, lng,
          about: `${hood} is a sought-after ${city.name} neighbourhood offering a mix of detached homes, townhomes and condos, with parks, schools and convenient access to transit, shopping and major highways.`,
          // Demographics from the city's real Statistics Canada 2021 Census profile.
          population: between(11000, 52000), medianAge: cen.medianAge, medianIncome: cen.medianIncome,
          ownerPct: between(50, 92), walkScore: walk, transitScore: transit, bikeScore: bike, ageBuckets: JSON.stringify(cen.age),
          schools: { create: [
            { name: `${hood} P.S.`, type: "Elementary", rating: Math.round(frnd(6.5, 9.0) * 10) / 10, lat: lat + frnd(-0.01, 0.01), lng: lng + frnd(-0.01, 0.01) },
            { name: `${hood} S.S.`, type: "Secondary", rating: Math.round(frnd(6.5, 9.2) * 10) / 10, lat: lat + frnd(-0.01, 0.01), lng: lng + frnd(-0.01, 0.01) },
          ] },
        },
      });
      nbCount++;

      const n = between(9, 15);
      for (let i = 0; i < n; i++) {
        const mode = rnd() < 0.78 ? "Sale" : "Rent";
        const type = city.slug === "toronto" && rnd() < 0.5 ? pick(["Condo Apt", "Condo Apt", "Condo Townhouse", "Townhouse"]) : pick(TYPES);
        const beds = type === "Condo Apt" ? between(1, 3) : between(3, 5);
        const baths = Math.max(1, Math.min(beds, between(1, 4)));
        const isSold = mode === "Sale" && rnd() < 0.26;
        const isRented = mode === "Rent" && rnd() < 0.24;
        const closed = isSold || isRented;
        const listPrice = priceFor(type, mode, city.tier);
        const sqftMin = type === "Condo Apt" ? between(500, 1100) : between(1400, 3500);
        const sqftMax = sqftMin + (type === "Condo Apt" ? 99 : 499);
        const listedDays = closed ? between(30, 150) : between(0, 55);
        const plat = lat + frnd(-0.02, 0.02), plng = lng + frnd(-0.03, 0.03);
        const address = `${between(8, 4300)} ${pick(STREETS)} ${pick(SUFFIX)}`;
        const unit = type.includes("Condo") ? `${between(2, 30)}0${between(1, 9)}` : null;
        const code = `${pick(["W", "C", "E", "N", "S"])}${mls++}`;
        const owner = pick(listingOwners);
        const isCondo = type.includes("Condo");
        const soldPrice = isSold ? round1k(listPrice * frnd(0.94, 1.06)) : isRented ? Math.round(listPrice * frnd(0.97, 1.05)) : null;
        const property = await prisma.canonicalProperty.create({ data: { address, unit, city: city.name, lat: plat, lng: plng, propertyType: type, postalCode: `L${between(1, 9)}${pick("ABCEGHJKLMNPRSTVWXYZ".split(""))} ${between(1, 9)}${pick("ABCEGHJK".split(""))}${between(1, 9)}` } });
        const listing = await prisma.listing.create({
          data: {
            canonicalPropertyId: property.id, neighbourhoodId: nb.id, agentId: owner.id,
            feedType: closed ? "VOW" : "IDX", listingBrokerageCredit: pick(BROKERAGES), mlsNumber: code,
            status: isSold ? "Sold" : isRented ? "Rented" : "Active", mode, listPrice, soldPrice, soldDate: closed ? daysAgo(between(4, 140)) : null,
            beds, bedsPlus: type === "Condo Apt" ? 0 : (rnd() < 0.4 ? 1 : 0), baths, parking: isCondo ? between(0, 2) : between(2, 6),
            sqftMin, sqftMax, propertyType: type, lotSize: isCondo ? null : `${between(25, 65)} x ${between(95, 165)} ft`,
            maintenanceFee: isCondo ? between(350, 980) : null, taxesAnnual: round1k(listPrice * frnd(0.006, 0.009)),
            description: `${isCondo ? "Bright and spacious" : "Beautifully maintained"} ${beds}-bedroom ${type.toLowerCase()} in ${hood}, ${city.name}. ${isCondo ? "Open-concept layout with modern finishes, ensuite laundry and a balcony." : "Updated kitchen, hardwood floors, finished basement and a private backyard."} Steps to schools, parks and transit. ${mode === "Rent" ? "Available immediately." : "Move-in ready — book your private viewing today."}`,
            daysOnMarket: closed ? listedDays : between(0, 45), listedAt: daysAgo(listedDays), isFeatured: rnd() < 0.14,
            openHouse: !closed && rnd() < 0.18 ? JSON.stringify({ day: pick(["Sat", "Sun", "Thu"]), time: pick(["1:00-3:00pm", "2:00-4:00pm", "12:00-2:00pm"]) }) : null,
          },
        });
        const kinds = PHOTO_KINDS.slice(0, between(4, 6));
        await prisma.listingMedia.createMany({ data: kinds.map((k, idx) => ({ listingId: listing.id, url: photo(`${code}-${k}`, k), caption: k, order: idx, isVowGated: idx > 0 })) });
        const events: { date: Date; event: string; price: number }[] = [{ date: daysAgo(listedDays), event: "Listed", price: listPrice }];
        if (closed && soldPrice) events.push({ date: listing.soldDate!, event: isRented ? "Leased" : "Sold", price: soldPrice });
        await prisma.priceEvent.createMany({ data: events.map((e) => ({ listingId: listing.id, ...e })) });
        listingCount++;
      }
    }
  }

  // ---- sample leads per tenant ----
  let leadCount = 0;
  for (const t of tenantSummaries) {
    const rr = { i: 0 };
    const nLeads = between(8, 12);
    for (let i = 0; i < nLeads; i++) {
      const type = pick(["buyer", "buyer", "buyer", "seller", "renter"]);
      const region = pick(REGIONS);
      const name = pick(LEAD_NAMES);
      let assigned: { id: string } | null = null;
      const created = daysAgo(between(0, 14));
      if (t.routing === "round-robin") { assigned = t.agents[rr.i % t.agents.length]; rr.i++; }
      else if (t.routing === "geographic") { const inR = t.agents.filter((a) => a.region === region); assigned = inR.length ? pick(inR) : pick(t.agents); }
      else { assigned = rnd() < 0.5 ? pick(t.agents) : null; }
      const status = assigned ? pick(["new", "new", "contacted", "qualified", "closed"]) : "new";
      const lead = await prisma.lead.create({ data: { tenantId: t.id, type, name, email: `${name.split(" ")[0].toLowerCase()}@example.com`, phone: `416-555-0${between(100, 999)}`, message: type === "seller" ? "Interested in a home valuation (CMA)." : type === "renter" ? "Looking to rent in the area." : "Interested in viewing homes.", region, status, assignedAgentId: assigned?.id ?? null, claimedAt: assigned && status !== "new" ? created : null, slaDueAt: assigned ? null : hrsFromNow(between(1, 6)), sourcePage: pick(["/search?mode=Sale", "/home-estimator", "/city/toronto", "/listing"]), createdAt: created } });
      await prisma.leadEvent.create({ data: { leadId: lead.id, type: "created", detail: `Lead from ${lead.sourcePage}`, createdAt: created } });
      if (assigned) await prisma.leadEvent.create({ data: { leadId: lead.id, type: "routed", detail: `Auto-routed (${t.routing})`, agentId: assigned.id, createdAt: created } });
      leadCount++;
    }
  }

  console.log(`Seeded: ${CITIES.length} cities, ${nbCount} neighbourhoods, ${listingCount} listings, ${CITIES.length * 48} market-stat rows, ${leadCount} leads.`);
  console.log("Logins → platform@emeinfotech.ai/platform123 · admin@emeinfotech.ai/admin123 · admin@maplerealty.ca/admin123 · rahul@emeinfotech.ai/agent123 · demo@emeinfotech.ai/password123");
}

main().then(() => prisma.$disconnect()).catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
