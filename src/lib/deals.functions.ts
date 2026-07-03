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

const PUBLIC_DEALS_PAGE_SIZE = 1000;
const PUBLIC_DEALS_MAX_ROWS = 5000;
const PUBLIC_DEALS_SELECT =
  "id, external_id, condition, price_cents, list_price_cents, avg_price_30d_cents, avg_price_90d_cents, currency, in_stock, first_seen_at, country_code, discount_percent, shop_id, product:products!inner(id, asin, title, brand, image_url, category), shop:shops!inner(slug)";

type PublicOfferRow = {
  id: string;
  external_id: string;
  condition: string;
  price_cents: number;
  list_price_cents: number | null;
  avg_price_30d_cents: number | null;
  avg_price_90d_cents: number | null;
  currency: string;
  in_stock: boolean;
  first_seen_at: string | null;
  country_code: string;
  discount_percent: number | null;
  shop_id: string;
  product: {
    id: string;
    asin: string | null;
    title: string;
    brand: string | null;
    image_url: string | null;
    category: string | null;
  } | null;
  shop: { slug: string } | null;
};

export const getPublicDeals = createServerFn({ method: "GET" }).handler(async (): Promise<Deal[]> => {
  const supabase = createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );

  const fetchRange = async (from: number, to: number, withCount = false) => {
    const { data, error, count } = await supabase
      .from("offers")
      .select(PUBLIC_DEALS_SELECT, withCount ? { count: "exact" } : undefined)
      .eq("in_stock", true)
      .order("discount_percent", { ascending: false, nullsFirst: false })
      .range(from, to)
      .returns<PublicOfferRow[]>();

    if (error) {
      console.error("[getPublicDeals]", error);
      throw new Error(error.message);
    }
    return { data: data ?? [], count };
  };

  const firstPage = await fetchRange(0, PUBLIC_DEALS_PAGE_SIZE - 1, true);
  const total = Math.min(firstPage.count ?? firstPage.data.length, PUBLIC_DEALS_MAX_ROWS);
  const remainingRanges: Array<[number, number]> = [];
  for (let from = PUBLIC_DEALS_PAGE_SIZE; from < total; from += PUBLIC_DEALS_PAGE_SIZE) {
    remainingRanges.push([from, Math.min(from + PUBLIC_DEALS_PAGE_SIZE - 1, total - 1)]);
  }
  const remainingPages = await Promise.all(remainingRanges.map(([from, to]) => fetchRange(from, to)));
  const data = [firstPage.data, ...remainingPages.map((p) => p.data)].flat();

  return data
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
