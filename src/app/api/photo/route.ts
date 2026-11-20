import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// Listing photos: redirect deterministically to a real, free-licensed photo in /public/photos
// (Unsplash, commercial-use OK), bundled locally so the app stays offline/keyless.
// Agent avatars: generated initials SVG.

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

// kind → photo category
const CAT: Record<string, string> = { ext: "ext", ext2: "ext", yard: "ext", living: "living", dining: "dining", kitchen: "kitchen", bed: "bed", bath: "bath" };

// Agent headshots: real photos in /public/photos/agents, matched to the name's
// likely gender (best-effort) and chosen deterministically.
const AGENT_PHOTOS = 8;
// Specific real headshots for named agents (file in /public/photos/agents/<file>.jpg).
const NAMED_AGENT_PHOTOS: Record<string, string> = { "ruchi bansal": "ruchi-bansal", "rahul sudan": "rahul-sudan" };
const FEMALE_NAMES = new Set(["ruchi", "aisha", "olivia", "emma", "sara", "sarah", "grace", "nina", "chloe", "hana", "maya", "priya", "sofia", "sophia", "mia", "ava", "isabella", "amara", "fatima", "leila", "zara", "ananya", "divya", "mei", "yuki", "linda", "jessica", "emily", "hannah", "victoria", "anita", "jasmine", "jassie", "shaunice", "nora", "ivy", "ella", "lily", "ruby", "aria", "rita", "diana", "elena", "carmen", "wendy", "natasha", "rachel", "laura", "tina", "amy", "kira", "noor", "sana", "mina", "rina", "lucy", "clara"]);

// count files per category once
let COUNTS: Record<string, number> | null = null;
function counts(): Record<string, number> {
  if (COUNTS) return COUNTS;
  COUNTS = {};
  try {
    const dir = path.join(process.cwd(), "public", "photos");
    for (const f of fs.readdirSync(dir)) {
      const m = f.match(/^([a-z]+)-(\d+)\.jpg$/);
      if (m) COUNTS[m[1]] = Math.max(COUNTS[m[1]] ?? 0, Number(m[2]));
    }
  } catch { /* no photos dir */ }
  return COUNTS;
}

const PALETTES: [string, string][] = [["#1f3a5f", "#3f6f9c"], ["#2d6a4f", "#74c69d"], ["#7d4f50", "#c08497"], ["#5e548e", "#9f86c0"], ["#34495e", "#5d7a99"], ["#8d6e3a", "#c2a878"], ["#1d3557", "#457b9d"], ["#3a405a", "#778da9"]];

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const seed = sp.get("seed") ?? "x";
  const kind = sp.get("kind") ?? "ext";

  if (kind === "agent") {
    // Named override: serve a specific headshot if the file exists.
    const named = NAMED_AGENT_PHOTOS[seed.toLowerCase().trim()];
    if (named) {
      try {
        if (fs.existsSync(path.join(process.cwd(), "public", "photos", "agents", `${named}.jpg`))) {
          return new NextResponse(null, { status: 307, headers: { Location: `/photos/agents/${named}.jpg`, "Cache-Control": "public, max-age=31536000, immutable" } });
        }
      } catch { /* fall through to stock photo */ }
    }
    const first = (seed.split(" ")[0] ?? "").toLowerCase().replace(/[^a-z]/g, "");
    const gender = FEMALE_NAMES.has(first) ? "women" : "men";
    const idx = (hash(seed) % AGENT_PHOTOS) + 1;
    // relative redirect resolves against the public origin (works behind the tunnel)
    return new NextResponse(null, {
      status: 307,
      headers: { Location: `/photos/agents/${gender}-${idx}.jpg`, "Cache-Control": "public, max-age=31536000, immutable" },
    });
  }

  const cat = CAT[kind] ?? "ext";
  const n = counts()[cat] ?? 0;
  if (n > 0) {
    const idx = (hash(seed) % n) + 1;
    // RELATIVE redirect — behind a reverse proxy/tunnel `req.url` carries the
    // internal host (localhost:3200), so an absolute redirect would point the
    // browser at a host it can't reach. A relative Location resolves against
    // whatever public origin the browser used.
    return new NextResponse(null, {
      status: 307,
      headers: { Location: `/photos/${cat}-${idx}.jpg`, "Cache-Control": "public, max-age=31536000, immutable" },
    });
  }

  // fallback gradient if no photos bundled
  const [c1, c2] = PALETTES[hash(seed) % PALETTES.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><rect width="800" height="600" fill="url(#g)"/></svg>`;
  return new Response(svg, { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=31536000, immutable" } });
}
