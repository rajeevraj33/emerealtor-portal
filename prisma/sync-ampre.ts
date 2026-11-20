// AMPRE → portal sync. Imports real TRREB listings/photos and market stats into our DB.
//
//   npx tsx prisma/sync-ampre.ts                 # full: active + sold/leased + stats
//   npx tsx prisma/sync-ampre.ts --active        # only active listings (+ photos)
//   npx tsx prisma/sync-ampre.ts --sold          # only recent sold/leased
//   npx tsx prisma/sync-ampre.ts --stats         # only 24-mo MarketStat
//   npx tsx prisma/sync-ampre.ts --city Milton --max 40   # small test slice
//
// Scope (env, with defaults):
//   AMPRE_SOLD_MONTHS=6    individual sold/leased rows to store
//   AMPRE_STATS_MONTHS=24  months aggregated into MarketStat
//   AMPRE_MEDIA_MAX=30     photos stored per active listing
//
// Idempotent: listings upsert by mlsNumber (=ListingKey); media/price-events are
// replaced per listing. Real seed/demo data is left untouched (additive).

import { PrismaClient } from "@prisma/client";
import {
  replicate, ampreGet, ampreEnabled, gtaCityFilter, normalizeCity,
  mapStatus, mapPropertyType, parseSqft, jitter, addressParts, neighbourhoodSlug, cleanRegion,
  PROPERTY_SELECT, GTA_CITIES,
} from "../src/lib/ampre";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { recomputeMarketStats } from "../src/lib/market-recompute";

const prisma = new PrismaClient();

const chunk = <T>(a: T[], n = 400) => { const o: T[][] = []; for (let i = 0; i < a.length; i += n) o.push(a.slice(i, i + n)); return o; };

const MEDIA_BATCH = 150; // listing keys per Media API call (amortizes fetch latency)

// SQLite bulk-load tuning: drop the per-write fsync (biggest import cost).
// Safe for a re-runnable import; the DB is rebuilt from the feed on any failure.
async function tuneSqlite() {
  // $queryRawUnsafe tolerates the result row some PRAGMAs return (e.g. journal_mode).
  for (const p of ["PRAGMA synchronous = OFF", "PRAGMA journal_mode = WAL", "PRAGMA temp_store = MEMORY", "PRAGMA cache_size = -100000"]) {
    try { await prisma.$queryRawUnsafe(p); } catch (e) { console.log(`  (pragma skipped: ${p})`); }
  }
}

// ---- args ----
const argv = process.argv.slice(2);
const has = (f: string) => argv.includes(f);
const val = (f: string) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : undefined; };
const onlyCity = val("--city");
const MAX = val("--max") ? +val("--max")! : undefined;
const SOLD_MONTHS = +(process.env.AMPRE_SOLD_MONTHS || 6);
const SOLD_SINCE = process.env.AMPRE_SOLD_SINCE || null; // absolute floor YYYY-MM-DD; overrides the rolling SOLD_MONTHS window
const STATS_MONTHS = +(process.env.AMPRE_STATS_MONTHS || 24);
const MEDIA_MAX = +(process.env.AMPRE_MEDIA_MAX || 30);
const doActive = has("--active") || (!has("--sold") && !has("--stats"));
const doSold = has("--sold") || (!has("--active") && !has("--stats"));
const doStats = has("--stats") || (!has("--active") && !has("--sold"));

const cities = onlyCity
  ? GTA_CITIES.filter((c) => c.name.toLowerCase() === onlyCity.toLowerCase())
  : GTA_CITIES;
const cityFilter = gtaCityFilter(cities);

// City-level StatsCan 2021 figures for synthesized neighbourhoods.
const CENSUS: Record<string, { pop: number; age: number; inc: number; buckets: string }> = {
  toronto: { pop: 2794356, age: 39, inc: 84000, buckets: '{"0-14":14,"15-19":5,"20-34":24,"35-49":23,"50-64":19,"65+":15}' },
  mississauga: { pop: 717961, age: 40, inc: 102000, buckets: '{"0-14":16,"15-19":6,"20-34":20,"35-49":21,"50-64":21,"65+":16}' },
  brampton: { pop: 656480, age: 36, inc: 111000, buckets: '{"0-14":19,"15-19":7,"20-34":22,"35-49":22,"50-64":19,"65+":11}' },
  markham: { pop: 338503, age: 42, inc: 104000, buckets: '{"0-14":15,"15-19":6,"20-34":18,"35-49":21,"50-64":22,"65+":18}' },
  vaughan: { pop: 323103, age: 41, inc: 124000, buckets: '{"0-14":16,"15-19":7,"20-34":18,"35-49":21,"50-64":22,"65+":16}' },
  "richmond-hill": { pop: 202022, age: 42, inc: 102000, buckets: '{"0-14":15,"15-19":6,"20-34":18,"35-49":20,"50-64":22,"65+":19}' },
  oakville: { pop: 213759, age: 42, inc: 128000, buckets: '{"0-14":17,"15-19":7,"20-34":15,"35-49":21,"50-64":22,"65+":18}' },
  burlington: { pop: 186948, age: 44, inc: 106000, buckets: '{"0-14":15,"15-19":6,"20-34":16,"35-49":19,"50-64":23,"65+":21}' },
  oshawa: { pop: 175383, age: 39, inc: 86000, buckets: '{"0-14":16,"15-19":6,"20-34":21,"35-49":20,"50-64":20,"65+":17}' },
  milton: { pop: 132979, age: 36, inc: 126000, buckets: '{"0-14":21,"15-19":7,"20-34":18,"35-49":24,"50-64":18,"65+":12}' },
  ajax: { pop: 126666, age: 38, inc: 119000, buckets: '{"0-14":18,"15-19":7,"20-34":19,"35-49":21,"50-64":20,"65+":15}' },
  pickering: { pop: 99186, age: 42, inc: 118000, buckets: '{"0-14":15,"15-19":7,"20-34":17,"35-49":20,"50-64":23,"65+":18}' },
};

function monthsAgoISO(n: number) {
  const d = new Date(); d.setMonth(d.getMonth() - n);
  return d.toISOString().slice(0, 10);
}

// Sold/leased retention floor: an absolute date (AMPRE_SOLD_SINCE) wins over the rolling SOLD_MONTHS window.
const soldFloorISO = () => SOLD_SINCE || monthsAgoISO(SOLD_MONTHS);
const soldFloorDate = () =>
  SOLD_SINCE
    ? new Date(SOLD_SINCE + "T00:00:00Z")
    : (() => { const d = new Date(); d.setMonth(d.getMonth() - SOLD_MONTHS); return d; })();

// --------------------------------------------------------------------------
// fixtures: a system "MLS Listings" agent that owns all imported listings
// (so lead capture routes to the brokerage; MLS attribution stays on the card)
// --------------------------------------------------------------------------
async function importAgentId(): Promise<string> {
  const tenant = (await prisma.tenant.findFirst({ where: { isDefault: true } })) ||
    (await prisma.tenant.findFirst());
  if (!tenant) throw new Error("No tenant — run the seed first.");
  const brokerage = await prisma.brokerage.findFirst({ where: { tenantId: tenant.id } });
  const team = brokerage ? await prisma.team.findFirst({ where: { brokerageId: brokerage.id } }) : null;
  const existing = await prisma.agent.findFirst({ where: { tenantId: tenant.id, email: "ruchi2571@gmail.com" } });
  if (existing) return existing.id;
  const created = await prisma.agent.create({
    data: {
      tenantId: tenant.id, brokerageId: brokerage!.id, teamId: team?.id ?? null,
      name: "Ruchi Bansal", title: "Broker", phone: "+1 647-629-9225",
      email: "ruchi2571@gmail.com", photoUrl: "/Ruchi.png", region: "central", recoVerified: true, active: true, isTeamLead: true,
    },
  });
  return created.id;
}

const nbCache = new Map<string, string>();
async function resolveNeighbourhood(citySlug: string, cityName: string, region: string | null, lat: number, lng: number) {
  const slug = neighbourhoodSlug(citySlug, region);
  if (nbCache.has(slug)) return nbCache.get(slug)!;
  let nb = await prisma.neighbourhood.findUnique({ where: { slug } });
  if (!nb) {
    const c = CENSUS[citySlug] || { pop: 50000, age: 40, inc: 95000, buckets: '{"0-14":16,"15-19":6,"20-34":20,"35-49":21,"50-64":21,"65+":16}' };
    const j = jitter(slug, 0.05);
    const name = cleanRegion(region) || `${cityName} Central`;
    nb = await prisma.neighbourhood.create({
      data: {
        slug, name, city: cityName, citySlug, province: "ON",
        lat: lat + j.dlat, lng: lng + j.dlng,
        about: `${name} is a residential community in ${cityName}, in the Greater Toronto Area. Browse current MLS® listings, recent sales and market trends for ${name} below.`,
        population: c.pop, medianAge: c.age, medianIncome: c.inc,
        ownerPct: 68, walkScore: 62, transitScore: 58, bikeScore: 52, ageBuckets: c.buckets,
      },
    });
  }
  nbCache.set(slug, nb.id);
  return nb.id;
}

// --------------------------------------------------------------------------
// upsert one Property record → Listing (+ CanonicalProperty)
// --------------------------------------------------------------------------
async function upsertListing(r: any, agentId: string): Promise<string | null> {
  const city = normalizeCity(r.City);
  if (!city) return null;
  if (/deleted/i.test(r.UnparsedAddress || "") || /deleted/i.test(r.City || "")) return null;
  const sm = mapStatus(r);
  if (!sm) return null;
  const listPrice = Math.round(r.ListPrice || 0);
  if (sm.status === "Active" && listPrice <= 0) return null;
  const closePrice = r.ClosePrice ? Math.round(r.ClosePrice) : null;
  if (sm.status !== "Active" && !closePrice) return null;

  const { address, unit, postalCode } = addressParts(r);
  const beds = r.BedroomsTotal ?? r.BedroomsAboveGrade ?? 0;
  const bedsPlus = r.BedroomsBelowGrade ?? 0;
  const baths = r.BathroomsTotalInteger ?? 1;
  const parking = Math.round(r.ParkingTotal ?? r.CoveredSpaces ?? 0);
  const propertyType = mapPropertyType(r.PropertySubType, r.PropertyType);
  const { min: sqftMin, max: sqftMax } = parseSqft(r.LivingAreaRange, beds || 3);
  const nbId = await resolveNeighbourhood(city.slug, city.name, r.CityRegion || null, city.lat, city.lng);
  const j = jitter(r.ListingKey);
  const listedAt = new Date(r.ListingContractDate || r.OriginalEntryTimestamp || r.ModificationTimestamp || Date.now());
  const soldDate = r.CloseDate ? new Date(r.CloseDate) : null;
  // Skip bogus TRREB future-dated sales (e.g. CloseDate in year 2399/3549).
  if (sm.status !== "Active" && soldDate && soldDate.getTime() > Date.now() + 86400000) return null;

  const data = {
    neighbourhoodId: nbId, agentId,
    sourceBoard: "TRREB", feedType: sm.feedType,
    listingBrokerageCredit: (r.ListOfficeName ? `${r.ListOfficeName}` : "TRREB Member Brokerage"),
    status: sm.status, mode: sm.mode, listPrice: listPrice || closePrice || 0,
    soldPrice: closePrice, soldDate,
    beds, bedsPlus, baths, parking, sqftMin, sqftMax, propertyType,
    maintenanceFee: r.AssociationFee ? Math.round(r.AssociationFee) : null,
    taxesAnnual: r.TaxAnnualAmount ? Math.round(r.TaxAnnualAmount) : null,
    description: (r.PublicRemarks || "").toString().slice(0, 4000) || `${propertyType} in ${city.name}.`,
    daysOnMarket: r.DaysOnMarket ?? 1, listedAt,
  };

  const existing = await prisma.listing.findUnique({ where: { mlsNumber: r.ListingKey }, select: { id: true, canonicalPropertyId: true } });
  let listingId: string;
  if (existing) {
    await prisma.canonicalProperty.update({
      where: { id: existing.canonicalPropertyId },
      data: { address, unit, city: city.name, postalCode, lat: city.lat + j.dlat, lng: city.lng + j.dlng, propertyType },
    });
    await prisma.listing.update({ where: { id: existing.id }, data });
    listingId = existing.id;
  } else {
    const cp = await prisma.canonicalProperty.create({
      data: { address, unit, city: city.name, province: "ON", postalCode, lat: city.lat + j.dlat, lng: city.lng + j.dlng, propertyType },
    });
    const created = await prisma.listing.create({ data: { ...data, mlsNumber: r.ListingKey, canonicalPropertyId: cp.id } });
    listingId = created.id;
  }

  // price events (replace)
  await prisma.priceEvent.deleteMany({ where: { listingId } });
  const events: { listingId: string; date: Date; event: string; price: number }[] = [];
  const orig = Math.round(r.OriginalListPrice || listPrice || 0);
  if (orig > 0) events.push({ listingId, date: listedAt, event: "Listed", price: orig });
  if (closePrice && soldDate) events.push({ listingId, date: soldDate, event: sm.status === "Rented" ? "Leased" : "Sold", price: closePrice });
  if (events.length) await prisma.priceEvent.createMany({ data: events });

  return r.ListingKey;
}

// --------------------------------------------------------------------------
// media: bulk-fetch photos for a batch of listing keys, replace per listing
// --------------------------------------------------------------------------
async function syncMedia(keys: string[], cap = MEDIA_MAX, coverOnly = false) {
  if (!keys.length) return;
  const inList = keys.map((k) => `'${k}'`).join(",");
  // coverOnly → fetch just the preferred photo per listing (tiny, fast response).
  const filter =
    `ResourceName eq 'Property' and MediaCategory eq 'Photo' and ` +
    `ImageSizeDescription eq 'Largest'` +
    (coverOnly ? ` and PreferredPhotoYN eq true` : ``) +
    ` and ResourceRecordKey in (${inList})`;
  const path = `Media?$select=ResourceRecordKey,MediaURL,Order,PreferredPhotoYN&$top=${coverOnly ? 500 : 8000}&$orderby=ResourceRecordKey,Order&$filter=${encodeURIComponent(filter)}`;
  const feed = ampreEnabled("IDX") ? "IDX" : "VOW";
  const data = await ampreGet<{ value: any[] }>(path, feed);
  const byKey = new Map<string, any[]>();
  for (const m of data.value || []) {
    if (!m.MediaURL) continue;
    const arr = byKey.get(m.ResourceRecordKey) || [];
    arr.push(m); byKey.set(m.ResourceRecordKey, arr);
  }
  for (const [mlsNumber, photos] of byKey) {
    const listing = await prisma.listing.findUnique({ where: { mlsNumber }, select: { id: true } });
    if (!listing) continue;
    photos.sort((a, b) => (b.PreferredPhotoYN === true ? 1 : 0) - (a.PreferredPhotoYN === true ? 1 : 0) || (a.Order ?? 0) - (b.Order ?? 0));
    await prisma.listingMedia.deleteMany({ where: { listingId: listing.id } });
    await prisma.listingMedia.createMany({
      data: photos.slice(0, cap).map((m, i) => ({ listingId: listing.id, url: m.MediaURL, order: i, isVowGated: false })),
    });
  }
}

// --------------------------------------------------------------------------
// phases
// --------------------------------------------------------------------------
async function importActive(agentId: string) {
  console.log(`\n▶ ACTIVE listings — cities: ${cities.map((c) => c.name).join(", ")}`);
  const filter = `${cityFilter} and StandardStatus eq 'Active' and ContractStatus eq 'Available'`;
  let n = 0; const mediaQueue: string[] = [];
  for await (const page of replicate({ feed: ampreEnabled("IDX") ? "IDX" : "VOW", resource: "Property", keyField: "ListingKey", extraFilter: filter, select: PROPERTY_SELECT, pageSize: 1000, maxRecords: MAX })) {
    for (const r of page) {
      const key = await upsertListing(r, agentId);
      if (key) { n++; mediaQueue.push(key); }
      if (mediaQueue.length >= MEDIA_BATCH) { await syncMedia(mediaQueue.splice(0, MEDIA_BATCH)); }
    }
    console.log(`  …${n} active imported`);
    if (MAX && n >= MAX) break;
  }
  if (mediaQueue.length) await syncMedia(mediaQueue);
  console.log(`✓ ACTIVE done: ${n} listings`);
}

async function importSold(agentId: string) {
  if (!ampreEnabled("VOW")) { console.log("• VOW token not set — skipping sold/leased"); return; }
  const since = soldFloorISO();
  const today = new Date().toISOString().slice(0, 10);
  console.log(`\n▶ SOLD/LEASED ${since} … ${today} — NEWEST FIRST (stoppable; freshest sales land first)`);
  const filter = `${cityFilter} and (MlsStatus eq 'Sold' or MlsStatus eq 'Leased') and CloseDate ge ${since} and CloseDate le ${today}`;
  const sel = PROPERTY_SELECT.join(",");
  let n = 0, skip = 0; const mediaQueue: string[] = [];
  for (;;) {
    const path = `Property?$orderby=CloseDate desc,ListingKey&$top=1000&$skip=${skip}&$filter=${encodeURIComponent(filter)}&$select=${encodeURIComponent(sel)}`;
    const data = await ampreGet<{ value: any[] }>(path, "VOW");
    const rows = data.value || [];
    if (!rows.length) break;
    for (const r of rows) {
      const key = await upsertListing(r, agentId);
      if (key) { n++; mediaQueue.push(key); }
      if (mediaQueue.length >= MEDIA_BATCH) await syncMedia(mediaQueue.splice(0, MEDIA_BATCH), 1, true); // cover only
    }
    skip += rows.length;
    const newest = rows[0]?.CloseDate?.slice(0, 10), oldest = rows[rows.length - 1]?.CloseDate?.slice(0, 10);
    console.log(`  …${n} sold/leased imported (down to CloseDate ${oldest})`);
    if (rows.length < 1000) break;
    if (MAX && n >= MAX) break;
  }
  if (mediaQueue.length) await syncMedia(mediaQueue, 1, true);
  console.log(`✓ SOLD/LEASED done: ${n} listings`);
}

async function computeStats() {
  if (!ampreEnabled("VOW")) { console.log("• VOW token not set — skipping MarketStat"); return; }
  const since = monthsAgoISO(STATS_MONTHS);
  console.log(`\n▶ MarketStat aggregation since ${since}`);
  const filter = `${cityFilter} and (MlsStatus eq 'Sold' or MlsStatus eq 'Leased') and CloseDate ge ${since}`;
  // bucket: citySlug|YYYY-MM-01 → sums
  type Acc = { sold: number; soldSum: number; rent: number; rentSum: number; city: string };
  const buckets = new Map<string, Acc>();
  let scanned = 0;
  for await (const page of replicate({ feed: "VOW", resource: "Property", keyField: "ListingKey", extraFilter: filter, select: ["ListingKey", "City", "CloseDate", "ClosePrice", "MlsStatus", "TransactionType", "ModificationTimestamp"], pageSize: 5000, maxRecords: MAX })) {
    for (const r of page) {
      const city = normalizeCity(r.City); if (!city || !r.CloseDate || !r.ClosePrice) continue;
      const month = `${r.CloseDate.slice(0, 7)}-01`;
      const key = `${city.slug}|${month}`;
      const acc = buckets.get(key) || { sold: 0, soldSum: 0, rent: 0, rentSum: 0, city: city.name };
      if (/leased/i.test(r.MlsStatus) || /lease|rent/i.test(r.TransactionType || "")) { acc.rent++; acc.rentSum += r.ClosePrice; }
      else { acc.sold++; acc.soldSum += r.ClosePrice; }
      buckets.set(key, acc);
    }
    scanned += page.length;
    console.log(`  …scanned ${scanned}`);
  }
  // write
  let wrote = 0;
  for (const [key, a] of buckets) {
    const [citySlug, month] = key.split("|");
    const monthDate = new Date(month);
    await prisma.marketStat.deleteMany({ where: { citySlug, month: monthDate } });
    await prisma.marketStat.create({
      data: {
        citySlug, city: a.city, month: monthDate,
        avgSoldPrice: a.sold ? Math.round(a.soldSum / a.sold) : 0, salesCount: a.sold,
        avgRentPrice: a.rent ? Math.round(a.rentSum / a.rent) : 0, rentCount: a.rent,
      },
    });
    wrote++;
  }
  console.log(`✓ MarketStat done: ${wrote} city-months from ${scanned} transactions`);
}

// Remove all imported data (listings owned by the import agent + their canonical
// properties, cascaded media/price-events, and orphaned synthesized neighbourhoods).
// Seed/demo data (agents with schools, other tenants) is untouched.
async function purgeImported() {
  const agent = await prisma.agent.findFirst({ where: { email: "ruchi2571@gmail.com" } });
  if (!agent) { console.log("• Nothing imported to purge."); return; }
  const listings = await prisma.listing.findMany({ where: { agentId: agent.id }, select: { id: true, canonicalPropertyId: true } });
  const cpIds = listings.map((l) => l.canonicalPropertyId);
  await prisma.favourite.deleteMany({ where: { listingId: { in: listings.map((l) => l.id) } } });
  await prisma.listing.deleteMany({ where: { agentId: agent.id } }); // cascades media + priceEvents
  await prisma.canonicalProperty.deleteMany({ where: { id: { in: cpIds } } });
  // synthesized neighbourhoods = no schools AND no remaining listings
  const orphan = await prisma.neighbourhood.findMany({
    where: { schools: { none: {} }, listings: { none: {} } }, select: { id: true },
  });
  await prisma.neighbourhood.deleteMany({ where: { id: { in: orphan.map((n) => n.id) } } });
  console.log(`✓ Purged ${listings.length} imported listings + ${orphan.length} synthesized neighbourhoods.`);
}

// --------------------------------------------------------------------------
// NIGHTLY INCREMENTAL SYNC — pulls only Property records changed since the saved
// cursor (RESO replication). One ModificationTimestamp pass; per record:
//   active / new / price-change      → upsert as Active
//   sold / leased (within retention) → upsert with close price + date (VOW)
//   expired/terminated/deleted/stale → REMOVE from our DB (de-list)
// --------------------------------------------------------------------------
const CURSOR_PATH = join(process.cwd(), "prisma", ".ampre-cursor.json");

function readCursor(): { ts: string; key: string } | null {
  try { if (existsSync(CURSOR_PATH)) return JSON.parse(readFileSync(CURSOR_PATH, "utf8")); } catch {}
  return null;
}
function writeCursor(ts: string, key: string) {
  try { writeFileSync(CURSOR_PATH, JSON.stringify({ ts, key }, null, 2)); } catch (e) { console.error("cursor write failed", e); }
}

async function deleteListingByMls(mls: string): Promise<boolean> {
  const l = await prisma.listing.findUnique({ where: { mlsNumber: mls }, select: { id: true, canonicalPropertyId: true } });
  if (!l) return false;
  await prisma.favourite.deleteMany({ where: { listingId: l.id } });
  await prisma.booking.deleteMany({ where: { listingId: l.id } });
  await prisma.lead.updateMany({ where: { listingId: l.id }, data: { listingId: null } });
  await prisma.listing.delete({ where: { id: l.id } }); // cascades media + priceEvents
  await prisma.canonicalProperty.deleteMany({ where: { id: l.canonicalPropertyId, listings: { none: {} } } });
  return true;
}

// prune sold/leased older than the retention window (keeps the DB lean as new sales arrive)
async function pruneOldSold(): Promise<number> {
  const cutoff = soldFloorDate();
  const old = await prisma.listing.findMany({ where: { status: { in: ["Sold", "Rented"] }, soldDate: { lt: cutoff } }, select: { id: true, canonicalPropertyId: true } });
  if (!old.length) return 0;
  const ids = old.map((o) => o.id), cps = old.map((o) => o.canonicalPropertyId);
  for (const c of chunk(ids)) { await prisma.favourite.deleteMany({ where: { listingId: { in: c } } }); await prisma.booking.deleteMany({ where: { listingId: { in: c } } }); await prisma.lead.updateMany({ where: { listingId: { in: c } }, data: { listingId: null } }); }
  for (const c of chunk(ids)) await prisma.listing.deleteMany({ where: { id: { in: c } } });
  for (const c of chunk(cps)) await prisma.canonicalProperty.deleteMany({ where: { id: { in: c }, listings: { none: {} } } });
  return old.length;
}

async function incrementalSync(agentId: string) {
  const feed = ampreEnabled("VOW") ? "VOW" : "IDX";
  const retentionStart = soldFloorDate();
  // first run (no cursor) → look back 2 days for a safe overlap; otherwise resume
  const cursor = readCursor() ?? { ts: new Date(Date.now() - 2 * 86400000).toISOString().replace(/\.\d+Z$/, "Z"), key: "0" };
  console.log(`\n▶ INCREMENTAL since ${cursor.ts} (key ${cursor.key}) · feed=${feed}`);

  let upserts = 0, removes = 0, scanned = 0, maxTs = cursor.ts, maxKey = cursor.key;
  const mediaActive: string[] = [], mediaSold: string[] = [];

  for await (const page of replicate({ feed, resource: "Property", keyField: "ListingKey", extraFilter: cityFilter, select: PROPERTY_SELECT, pageSize: 1000, since: cursor, maxRecords: MAX })) {
    for (const r of page) {
      scanned++; maxTs = r.ModificationTimestamp; maxKey = r.ListingKey;
      const sm = mapStatus(r);
      const tombstone = /deleted/i.test(r.City || "") || /deleted/i.test(r.UnparsedAddress || "");
      const staleSold = sm && sm.status !== "Active" && r.CloseDate && new Date(r.CloseDate) < retentionStart;
      if (!sm || tombstone || staleSold) {            // de-list / removal
        if (await deleteListingByMls(r.ListingKey)) removes++;
        continue;
      }
      if (await upsertListing(r, agentId)) {           // add / update
        upserts++;
        (sm.status === "Active" ? mediaActive : mediaSold).push(r.ListingKey);
      }
      if (mediaActive.length >= MEDIA_BATCH) await syncMedia(mediaActive.splice(0, MEDIA_BATCH));
      if (mediaSold.length >= MEDIA_BATCH) await syncMedia(mediaSold.splice(0, MEDIA_BATCH), 1, true);
    }
    console.log(`  …scanned ${scanned} · ${upserts} upserts · ${removes} removes`);
    writeCursor(maxTs, maxKey); // checkpoint per page so a crash resumes cleanly
  }
  if (mediaActive.length) await syncMedia(mediaActive);
  if (mediaSold.length) await syncMedia(mediaSold, 1, true);
  writeCursor(maxTs, maxKey);
  console.log(`✓ INCREMENTAL — scanned ${scanned}, ${upserts} upserts, ${removes} removes`);
}

async function runIncremental() {
  await tuneSqlite();
  const agentId = await importAgentId();
  await incrementalSync(agentId);
  const pruned = await pruneOldSold();
  if (pruned) console.log(`✓ pruned ${pruned} sold/leased beyond ${SOLD_MONTHS}-month window`);
  const months = await recomputeMarketStats(prisma); // refresh dashboards from local rows (no download)
  console.log(`✓ market stats refreshed: ${months} city-months`);
  const [a, s] = await Promise.all([
    prisma.listing.count({ where: { status: "Active" } }),
    prisma.listing.count({ where: { status: { in: ["Sold", "Rented"] } } }),
  ]);
  console.log(`📊 now live: ${a} active · ${s} sold/rented`);
}

async function main() {
  if (!ampreEnabled("IDX") && !ampreEnabled("VOW")) {
    console.log("No AMPRE tokens set — nothing to do."); return;
  }
  if (has("--incremental")) { return runIncremental(); }
  if (has("--purge")) { await purgeImported(); if (argv.length === 1) return; }
  console.log(`AMPRE sync · IDX=${ampreEnabled("IDX")} VOW=${ampreEnabled("VOW")} · soldFloor=${soldFloorISO()}${SOLD_SINCE ? " (fixed)" : ` (${SOLD_MONTHS}mo)`} statsMonths=${STATS_MONTHS}${onlyCity ? ` · city=${onlyCity}` : ""}${MAX ? ` · max=${MAX}` : ""}`);
  await tuneSqlite();
  const agentId = await importAgentId();
  if (doActive) await importActive(agentId);
  if (doSold) await importSold(agentId);
  if (doStats) await computeStats();
  const counts = {
    listings: await prisma.listing.count({ where: { sourceBoard: "TRREB" } }),
    media: await prisma.listingMedia.count(),
    marketStats: await prisma.marketStat.count(),
  };
  console.log("\n📊", counts);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
