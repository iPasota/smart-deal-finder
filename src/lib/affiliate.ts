// Affiliate deeplink builder. Central Amazon PartnerNet tag — override via
// VITE_AMAZON_TAG at build time to swap without touching code.
export const AMAZON_TAG =
  (import.meta.env.VITE_AMAZON_TAG as string | undefined) || "whdfinder-21";

export function buildDeeplink(asin: string, tag: string = AMAZON_TAG): string {
  // Amazon Warehouse listing for a specific ASIN. `psc=1` lands directly on the
  // Warehouse offer when available. We add `tag=` so the affiliate cookie is set
  // server-side by Amazon on first hit — no redirect hop on our side.
  const params = new URLSearchParams({
    tag,
    linkCode: "ll1",
    psc: "1",
    th: "1",
  });
  return `https://www.amazon.de/dp/${asin}?${params.toString()}`;
}

export function trackClick(productId: string): void {
  // Phase 1: no-op. In Phase 2+ this becomes:
  // navigator.sendBeacon("/api/public/click", JSON.stringify({ productId }));
  if (typeof window === "undefined") return;
  if (typeof navigator.sendBeacon !== "function") return;
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  productId;
}
