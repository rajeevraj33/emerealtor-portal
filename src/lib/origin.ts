// Public origin of the request. Behind a reverse proxy / Cloudflare tunnel,
// `req.url` carries the internal host (localhost:3200), so we prefer the
// X-Forwarded-* headers (Cloudflare sets these) and an explicit APP_ORIGIN
// override. Used for OAuth redirect URIs, which must match the public URL.
export function appOrigin(req: Request): string {
  if (process.env.APP_ORIGIN) return process.env.APP_ORIGIN;
  const xfHost = req.headers.get("x-forwarded-host") || req.headers.get("host");
  if (xfHost && !xfHost.startsWith("localhost") && !xfHost.startsWith("127.0.0.1")) {
    const proto = req.headers.get("x-forwarded-proto") || "https";
    return `${proto}://${xfHost.split(",")[0].trim()}`;
  }
  return new URL(req.url).origin;
}
