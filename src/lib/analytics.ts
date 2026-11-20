// Client-safe GA4 event helper. No-ops if GA isn't loaded (no ID set).
type GtagParams = Record<string, string | number | boolean | undefined>;

export function track(event: string, params: GtagParams = {}) {
  if (typeof window === "undefined") return;
  const w = window as unknown as { gtag?: (...args: unknown[]) => void };
  if (typeof w.gtag === "function") w.gtag("event", event, params);
}
