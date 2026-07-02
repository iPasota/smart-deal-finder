// Public server fns for category pages. Uses the anon publishable client
// (RLS: categories are publicly readable; offers/products already are too).

import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import type { ShopSlug } from "@/lib/shops";
import type { Deal, Condition } from "@/lib/mock-deals";
import type { CategoryRow } from "@/lib/categories";

function anonClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

const KEEPA_TO_APP_CONDITION: Record<string, Condition> = {
  "Used - Like New": "like_new",
  "Used - Very Good": "very_good",
  "Used - Good": "good",
  "Used - Acceptable": "acceptable",
};
const mapCondition = (raw: string): Condition => KEEPA_TO_APP_CONDITION[raw] ?? "very_good";

export const getAllCategories = createServerFn({ method: "GET" }).handler(
  async (): Promise<CategoryRow[]> => {
    const supabase = anonClient();
    const { data, error } = await supabase
      .from("categories")
      .select("id, parent_id, slug, name, keepa_category_id, seo_title, seo_description, intro_md, outro_md, sort");
    if (error) throw new Error(error.message);
    return (data ?? []) as CategoryRow[];
  },
);

// Lightweight fn for the homepage: only top-level categories with product counts,
// used to render an internal-linking strip.
export type TopCategoryLink = { slug: string; name: string; count: number };

export const getTopCategoryLinks = createServerFn({ method: "GET" }).handler(
  async (): Promise<TopCategoryLink[]> => {
    const supabase = anonClient();
    const { data: cats, error } = await supabase
      .from("categories")
      .select("id, slug, name, sort")
      .is("parent_id", null)
      .order("sort")
      .order("name");
    if (error) throw new Error(error.message);
    const rows = (cats ?? []) as Array<{ id: string; slug: string; name: string; sort: number }>;
    if (rows.length === 0) return [];
    // Gather category_ids of each top's subtree (top + children).
    const { data: subs } = await supabase
      .from("categories")
      .select("id, parent_id")
      .in("parent_id", rows.map((r) => r.id));
    const subsByParent = new Map<string, string[]>();
    for (const s of subs ?? []) {
      const arr = subsByParent.get(s.parent_id as string) ?? [];
      arr.push(s.id as string);
      subsByParent.set(s.parent_id as string, arr);
    }
    const results: TopCategoryLink[] = [];
    for (const r of rows) {
      const ids = [r.id, ...(subsByParent.get(r.id) ?? [])];
      const { count } = await supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .in("category_id", ids);
      if ((count ?? 0) === 0) continue;
      results.push({ slug: r.slug, name: r.name, count: count ?? 0 });
    }
    return results;
  },
);

// Look up a category by its slug path (["elektronik"] or ["elektronik","smartphones"])
// and return the row + its ancestor breadcrumb.
export type CategoryPage = {
  category: CategoryRow;
  breadcrumb: CategoryRow[]; // top → current
  childCategories: CategoryRow[]; // direct children for further navigation
  deals: Deal[];
};

const PathSchema = z.object({
  parent: z.string().min(1),
  child: z.string().min(1).optional(),
});

export const getCategoryPage = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => PathSchema.parse(d))
  .handler(async ({ data }): Promise<CategoryPage | null> => {
    const supabase = anonClient();

    // Find parent
    const { data: parentRow, error: e1 } = await supabase
      .from("categories")
      .select("*")
      .is("parent_id", null)
      .eq("slug", data.parent)
      .maybeSingle();
    if (e1) throw new Error(e1.message);
    if (!parentRow) return null;

    let current = parentRow as CategoryRow;
    const breadcrumb: CategoryRow[] = [parentRow as CategoryRow];

    if (data.child) {
      const { data: childRow, error: e2 } = await supabase
        .from("categories")
        .select("*")
        .eq("parent_id", parentRow.id)
        .eq("slug", data.child)
        .maybeSingle();
      if (e2) throw new Error(e2.message);
      if (!childRow) return null;
      current = childRow as CategoryRow;
      breadcrumb.push(childRow as CategoryRow);
    }

    // Direct children (for further navigation on the page)
    const { data: children } = await supabase
      .from("categories")
      .select("id, parent_id, slug, name, keepa_category_id, seo_title, seo_description, intro_md, outro_md, sort")
      .eq("parent_id", current.id)
      .order("sort")
      .order("name");

    // Collect all descendant category ids to include child-only products.
    const catIds = [current.id];
    for (const c of children ?? []) catIds.push(c.id);

    const { data: products } = await supabase
      .from("products")
      .select("id")
      .in("category_id", catIds);
    const productIds = (products ?? []).map((p) => p.id);
    let deals: Deal[] = [];
    if (productIds.length > 0) {
      const { data: offers } = await supabase
        .from("offers")
        .select(
          "id, external_id, condition, price_cents, list_price_cents, avg_price_30d_cents, avg_price_90d_cents, currency, in_stock, first_seen_at, country_code, discount_percent, shop_id, product:products!inner(id, asin, title, brand, image_url, category), shop:shops!inner(slug)",
        )
        .in("product_id", productIds)
        .eq("in_stock", true)
        .order("discount_percent", { ascending: false, nullsFirst: false })
        .limit(200);
      deals = (offers ?? [])
        .filter((o) => o.product && o.shop)
        .map((o) => {
          const list =
            o.list_price_cents && o.list_price_cents > o.price_cents
              ? o.list_price_cents
              : o.avg_price_30d_cents && o.avg_price_30d_cents > o.price_cents
                ? o.avg_price_30d_cents
                : o.avg_price_90d_cents && o.avg_price_90d_cents > o.price_cents
                  ? o.avg_price_90d_cents
                  : Math.round(o.price_cents * 1.25);
          return {
            id: o.id,
            asin: o.product!.asin ?? o.external_id,
            title: o.product!.title,
            brand: o.product!.brand ?? "",
            category: o.product!.category ?? current.name,
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
          } satisfies Deal;
        });
    }

    return {
      category: current,
      breadcrumb,
      childCategories: (children ?? []) as CategoryRow[],
      deals,
    };
  });
