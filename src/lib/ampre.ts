// AMPRE / PropTx (TRREB) RESO Web API client + field mappers.
// Docs: https://developer.ampre.ca  ·  Base: https://query.ampre.ca/odata
//
// Two feeds (one Bearer token each, in .env):
//   IDX → public active listings        (AMPRE_IDX_TOKEN)
//   VOW → active + sold/leased prices   (AMPRE_VOW_TOKEN, login-gated display)
//
// This module is PURE transport + mapping (no DB). prisma/sync-ampre.ts drives it.

export type Feed = "IDX" | "VOW";

const BASE = process.env.AMPRE_BASE_URL || "https://query.ampre.ca/odata";

export function ampreToken(feed: Feed): string | undefined {
  const t = feed === "VOW" ? process.env.AMPRE_VOW_TOKEN : process.env.AMPRE_IDX_TOKEN;
  return t && t.trim() ? t.trim() : undefined;
}

export function ampreEnabled(feed: Feed): boolean {
  return !!ampreToken(feed);
}

/** Raw OData GET. `path` is everything after the base, e.g. "Property?$top=1". */
export async function ampreGet<T = any>(path: string, feed: Feed): Promise<T> {
  const token = ampreToken(feed);
  if (!token) throw new Error(`AMPRE ${feed} token not set (.env AMPRE_${feed}_TOKEN)`);
  const url = `${BASE}/${path}`;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        signal: AbortSignal.timeout(25000), // never hang forever on a stalled connection
      });
      if (res.ok) return (await res.json()) as T;
      // 429 / 5xx → back off and retry; 4xx (other) → throw immediately with body
      if (res.status === 429 || res.status >= 500) {
        await sleep(800 * (attempt + 1));
        continue;
      }
      const body = await res.text().catch(() => "");
      throw new Error(`AMPRE ${res.status} on ${url}\n${body.slice(0, 500)}`);
    } catch (e: any) {
      if (e?.name === "TimeoutError" || e?.name === "AbortError") { await sleep(500); continue; } // retry stalls
      throw e;
    }
  }
  throw new Error(`AMPRE failed after retries: ${url}`);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const enc = (s: string) => encodeURIComponent(s);

/**
 * Timestamp+key keyset replication (AMPRE-recommended; never $skip).
 * Yields records in pages, ordered by (ModificationTimestamp, <keyField>).
 * `extraFilter` is ANDed with the keyset predicate. `select` limits columns.
 */
export async function* replicate(opts: {
  feed: Feed;
  resource: "Property" | "Media";
  keyField: string; // ListingKey | MediaKey
  extraFilter?: string;
  select?: string[];
  pageSize?: number;
  maxRecords?: number; // safety cap for test runs
  since?: { ts: string; key: string }; // resume cursor for incremental sync
}): AsyncGenerator<any[], void, unknown> {
  const { feed, resource, keyField, extraFilter, select } = opts;
  const top = Math.min(opts.pageSize ?? 1000, 100000);
  let lastTs = opts.since?.ts || "1970-01-01T00:00:00Z";
  let lastKey = opts.since?.key || "0";
  let total = 0;

  for (;;) {
    const keyset =
      `(ModificationTimestamp gt ${lastTs} or ` +
      `(ModificationTimestamp eq ${lastTs} and ${keyField} gt '${lastKey}'))`;
    const filter = extraFilter ? `(${extraFilter}) and ${keyset}` : keyset;
    let path =
      `${resource}?$orderby=ModificationTimestamp,${keyField}` +
      `&$top=${top}&$filter=${enc(filter)}`;
    if (select?.length) path += `&$select=${enc(select.join(","))}`;

    const data = await ampreGet<{ value: any[] }>(path, feed);
    const rows = data.value || [];
    if (rows.length === 0) return;

    yield rows;
    total += rows.length;

    const last = rows[rows.length - 1];
    lastTs = last.ModificationTimestamp;
    lastKey = last[keyField];

    if (opts.maxRecords && total >= opts.maxRecords) return;
    if (rows.length < top) return; // last page
  }
}

// ---------------------------------------------------------------------------
// GTA city taxonomy. TRREB codes Toronto into districts ("Toronto C07",
// "Toronto W05", "Toronto E04"); every other GTA municipality is a plain name.
// ---------------------------------------------------------------------------
export const GTA_CITIES: { name: string; slug: string; lat: number; lng: number }[] = [
  { name: "Toronto", slug: "toronto", lat: 43.6532, lng: -79.3832 },
  { name: "Mississauga", slug: "mississauga", lat: 43.589, lng: -79.644 },
  { name: "Brampton", slug: "brampton", lat: 43.7315, lng: -79.7624 },
  { name: "Oakville", slug: "oakville", lat: 43.4675, lng: -79.6877 },
  { name: "Vaughan", slug: "vaughan", lat: 43.8361, lng: -79.4983 },
  { name: "Markham", slug: "markham", lat: 43.8561, lng: -79.337 },
  { name: "Richmond Hill", slug: "richmond-hill", lat: 43.8828, lng: -79.4403 },
  { name: "Milton", slug: "milton", lat: 43.5183, lng: -79.8774 },
  { name: "Burlington", slug: "burlington", lat: 43.3255, lng: -79.799 },
  { name: "Pickering", slug: "pickering", lat: 43.8384, lng: -79.0868 },
  { name: "Ajax", slug: "ajax", lat: 43.8509, lng: -79.0204 },
  { name: "Oshawa", slug: "oshawa", lat: 43.8971, lng: -78.8658 },
];

/** OData $filter fragment matching any of our GTA cities (Toronto via startswith). */
export function gtaCityFilter(cities = GTA_CITIES): string {
  const parts = cities.map((c) =>
    c.slug === "toronto" ? `startswith(City,'Toronto')` : `City eq '${c.name.replace(/'/g, "''")}'`
  );
  return `(${parts.join(" or ")})`;
}

/** Normalize an AMPRE City ("Toronto C07", "Mississauga") → our municipality. */
export function normalizeCity(city?: string | null): { name: string; slug: string; lat: number; lng: number } | null {
  if (!city) return null;
  const c = city.trim();
  if (/^Toronto\b/i.test(c)) return GTA_CITIES[0];
  const hit = GTA_CITIES.find((g) => g.name.toLowerCase() === c.toLowerCase());
  return hit ?? null;
}

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

/** TRREB CityRegion cleanup. Some boards prefix a community code:
 *  "1026 - CB Cobban" → "Cobban", "1034 - MN Milton North" → "Milton North".
 *  Clean names ("Erin Mills", "Black Creek") pass through unchanged. */
export function cleanRegion(region?: string | null): string | null {
  if (!region) return null;
  let s = region.trim();
  s = s.replace(/^\d+\s*-\s*/, "");      // strip leading "#### - "
  s = s.replace(/^[A-Z]{2}\s+(?=[A-Z])/, ""); // strip 2-letter area code ("CB ")
  return s.trim() || null;
}

// ---------------------------------------------------------------------------
// Field mappers (RESO → our schema)
// ---------------------------------------------------------------------------

/** Map MlsStatus/TransactionType → our { status, mode, feedType } or null to skip. */
export function mapStatus(r: any): { status: string; mode: string; feedType: Feed } | null {
  const mls = (r.MlsStatus || r.StandardStatus || "").toString();
  const tx = (r.TransactionType || "").toString();
  const mode = /lease|rent/i.test(tx) ? "Rent" : "Sale";

  // sold / leased → VOW-gated history
  if (/^sold$/i.test(mls)) return { status: "Sold", mode, feedType: "VOW" };
  if (/^leased$/i.test(mls)) return { status: "Rented", mode: "Rent", feedType: "VOW" };

  // on-market variants → public IDX
  if (/^(new|price change|extension|active|sold conditional|leased conditional)$/i.test(mls))
    return { status: "Active", mode, feedType: "IDX" };

  // expired / terminated / suspended / draft / deleted → skip
  return null;
}

const TYPE_MAP: [RegExp, string][] = [
  [/semi/i, "Semi-Detached"],
  [/det/i, "Detached"],
  [/condo\s*town|comm\s*element|common\s*element/i, "Condo Townhouse"],
  [/condo\s*apart|^apartment|co-?op/i, "Condo Apt"],
  [/town|row|att\/row/i, "Townhouse"],
];

/** PropertySubType → one of our 5 UI types. */
export function mapPropertyType(sub?: string | null, propType?: string | null): string {
  const s = (sub || "").trim();
  for (const [re, out] of TYPE_MAP) if (re.test(s)) return out;
  // fall back on the broad PropertyType
  if (/condo/i.test(propType || "")) return "Condo Apt";
  return "Detached";
}

/** LivingAreaRange "1000-1199" / "3500+" / "< 700" → { min, max }. */
export function parseSqft(range?: string | null, beds = 3): { min: number; max: number } {
  if (range) {
    const m = range.match(/(\d[\d,]*)\s*[-–to]+\s*(\d[\d,]*)/);
    if (m) return { min: +m[1].replace(/,/g, ""), max: +m[2].replace(/,/g, "") };
    const plus = range.match(/(\d[\d,]*)\s*\+/);
    if (plus) { const n = +plus[1].replace(/,/g, ""); return { min: n, max: Math.round(n * 1.25) }; }
    const lt = range.match(/<\s*(\d[\d,]*)/);
    if (lt) { const n = +lt[1].replace(/,/g, ""); return { min: Math.max(300, n - 200), max: n }; }
  }
  // no range → estimate from bedroom count
  const base = 600 + beds * 350;
  return { min: base, max: Math.round(base * 1.3) };
}

/** Deterministic small jitter (so co-located listings don't stack on the map). */
export function jitter(key: string, scale = 0.012): { dlat: number; dlng: number } {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) { h ^= key.charCodeAt(i); h = Math.imul(h, 16777619); }
  const a = ((h >>> 0) % 1000) / 1000 - 0.5;
  const b = (((h >>> 10) >>> 0) % 1000) / 1000 - 0.5;
  return { dlat: a * scale, dlng: b * scale };
}

/** Build CanonicalProperty-ish address parts from a Property record. */
export function addressParts(r: any): { address: string; unit: string | null; postalCode: string | null } {
  const street = [r.StreetNumber, r.StreetName, r.StreetSuffix].filter(Boolean).join(" ").trim();
  const address = street || (r.UnparsedAddress || "").split(",")[0].trim() || "Address withheld";
  const unit = r.UnitNumber || r.ApartmentNumber || r.LegalApartmentNumber || null;
  return { address, unit: unit ? String(unit) : null, postalCode: r.PostalCode || null };
}

export const neighbourhoodSlug = (citySlug: string, region?: string | null) => {
  const clean = cleanRegion(region);
  return clean ? `${citySlug}-${slugify(clean)}` : `${citySlug}-central`;
};

/** Columns we pull for a Property (keeps payloads lean). */
export const PROPERTY_SELECT = [
  "ListingKey", "MlsStatus", "StandardStatus", "ContractStatus", "TransactionType",
  "PropertyType", "PropertySubType", "ListPrice", "OriginalListPrice", "ClosePrice", "CloseDate",
  "City", "CityRegion", "StreetNumber", "StreetName", "StreetSuffix", "UnitNumber",
  "ApartmentNumber", "LegalApartmentNumber", "PostalCode", "UnparsedAddress",
  "BedroomsTotal", "BedroomsAboveGrade", "BedroomsBelowGrade", "BathroomsTotalInteger",
  "ParkingTotal", "CoveredSpaces", "LivingAreaRange", "AssociationFee", "TaxAnnualAmount",
  "PublicRemarks", "DaysOnMarket", "ListOfficeName", "ListingContractDate",
  "OriginalEntryTimestamp", "ModificationTimestamp",
];
