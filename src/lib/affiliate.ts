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

export type ClickPosition = "primary" | "alternative";

/**
 * Fire-and-forget affiliate click log. Anonymous — no IP, no user id.
 * Uses sendBeacon so it survives the outbound navigation to the shop.
 */
export function trackClick(
  dealId: string,
  shop: string,
  position: ClickPosition = "primary",
): void {
  if (typeof window === "undefined") return;
  const body = JSON.stringify({ dealId, shop, position });
  try {
    if (typeof navigator.sendBeacon === "function") {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon("/api/public/track-click", blob);
      return;
    }
    void fetch("/api/public/track-click", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      keepalive: true,
    });
  } catch {
    // never break the outbound click on tracking failure
  }
}
