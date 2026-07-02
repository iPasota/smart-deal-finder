// Public read of active offers for the homepage listing.
// Uses the server publishable client (anon role) — RLS + GRANT SELECT to anon apply.
// Callable from public route loaders (no bearer token required).

import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { ShopSlug } from "@/lib/shops";
import type { Deal, Condition } from "@/lib/mock-deals";

const KEEPA_TO_APP_CONDITION: Record<string, Condition> = {
  "Used - Like New": "like_new",
  "Used - Very Good": "very_good",
  "Used - Good": "good",
  "Used - Acceptable": "acceptable",
};

function mapCondition(raw: string): Condition {
  return KEEPA_TO_APP_CONDITION[raw] ?? "very_good";
}

// Best-effort category label from a Keepa category string / root id.
function normalizeCategory(raw: string | null): string {
  if (!raw) return "Sonstiges";
  const s = raw.toLowerCase();
  if (s.includes("kopfhör") || s.includes("headphone")) return "Kopfhörer";
  if (s.includes("smartphone") || s.includes("handy") || s.includes("phone")) return "Smartphones";
  if (s.includes("laptop") || s.includes("notebook") || s.includes("macbook")) return "Laptops";
  if (s.includes("monitor")) return "Monitore";
  if (s.includes("kamera") || s.includes("camera")) return "Kameras";
  if (s.includes("tv") || s.includes("audio") || s.includes("soundbar")) return "TV & Audio";
  if (s.includes("konsol") || s.includes("playstation") || s.includes("xbox") || s.includes("nintendo"))
    return "Konsolen";
  if (s.includes("smart home") || s.includes("haushalt")) return "Smart Home";
  return raw;
}

export const getPublicDeals = createServerFn({ method: "GET" }).handler(async (): Promise<Deal[]> => {
  const supabase = createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );

  const { data, error } = await supabase
    .from("offers")
    .select(
      "id, external_id, condition, price_cents, list_price_cents, avg_price_30d_cents, avg_price_90d_cents, currency, in_stock, first_seen_at, country_code, discount_percent, shop_id, product:products!inner(id, asin, title, brand, image_url, category), shop:shops!inner(slug)",
    )
    .eq("in_stock", true)
    .order("discount_percent", { ascending: false, nullsFirst: false })
    .limit(300);

  if (error) {
    console.error("[getPublicDeals]", error);
    throw new Error(error.message);
  }

  return (data ?? [])
    .filter((o) => o.product && o.shop)
    .map((o): Deal => {
      const list =
        o.list_price_cents && o.list_price_cents > o.price_cents
          ? o.list_price_cents
          : o.avg_price_30d_cents && o.avg_price_30d_cents > o.price_cents
            ? o.avg_price_30d_cents
            : o.avg_price_90d_cents && o.avg_price_90d_cents > o.price_cents
              ? o.avg_price_90d_cents
              : Math.round(o.price_cents * 1.25);
      const asin = o.product!.asin ?? o.external_id;
      return {
        id: o.id,
        asin,
        title: o.product!.title,
        brand: o.product!.brand ?? "",
        category: normalizeCategory(o.product!.category ?? null),
        imageUrl: o.product!.image_url ?? "",
        condition: mapCondition(o.condition),
        priceCents: o.price_cents,
        newPriceCents: list,
        msrpCents: list,
        currency: "EUR",
        inStock: o.in_stock,
        firstSeenAt: (o.first_seen_at ?? "").slice(0, 10),
        shop: (o.shop!.slug as ShopSlug) ?? "amazon-warehouse",
        countryCode: "DE",
        alternatives: [],
        history: [],
      };
    });
});
