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

// Full category tree (max 3 levels) with product counts per node, used by
// the header mega-menu. Counts include the node's own products plus all
// descendants so hitting a leaf never leads to an empty page.
export type CategoryTreeNode = {
  id: string;
  slug: string;
  name: string;
  count: number;
  children: CategoryTreeNode[];
};

export const getCategoryTree = createServerFn({ method: "GET" }).handler(
  async (): Promise<CategoryTreeNode[]> => {
    const supabase = anonClient();
    const { data: cats, error } = await supabase
      .from("categories")
      .select("id, parent_id, slug, name, sort")
      .order("sort")
      .order("name");
    if (error) throw new Error(error.message);
    const rows = (cats ?? []) as Array<{
      id: string;
      parent_id: string | null;
      slug: string;
      name: string;
      sort: number;
    }>;
    if (rows.length === 0) return [];

    // Per-category direct counts of DISTINCT products with an in-stock offer.
    // This is what the user experiences on category pages — showing counts
    // based on total products (incl. out-of-stock) misleads when the menu
    // number is much bigger than what's actually clickable.
    const directCount = new Map<string, number>();
    const seenProduct = new Set<string>();
    const PAGE = 1000;
    for (let from = 0; ; from += PAGE) {
      const { data: page, error: pErr } = await supabase
        .from("offers")
        .select("product_id, product:products!inner(id, category_id)")
        .eq("in_stock", true)
        .range(from, from + PAGE - 1)
        .returns<Array<{ product_id: string; product: { id: string; category_id: string | null } | null }>>();
      if (pErr) throw new Error(pErr.message);
      if (!page || page.length === 0) break;
      for (const row of page) {
        const catId = row.product?.category_id;
        const pid = row.product_id;
        if (!catId || !pid) continue;
        if (seenProduct.has(pid)) continue;
        seenProduct.add(pid);
        directCount.set(catId, (directCount.get(catId) ?? 0) + 1);
      }
      if (page.length < PAGE) break;
    }

    type N = CategoryTreeNode & { parent_id: string | null };
    const byId = new Map<string, N>();
    rows.forEach((r) =>
      byId.set(r.id, {
        id: r.id,
        slug: r.slug,
        name: r.name,
        count: directCount.get(r.id) ?? 0,
        children: [],
        parent_id: r.parent_id,
      }),
    );
    const roots: N[] = [];
    byId.forEach((n) => {
      if (n.parent_id && byId.has(n.parent_id)) byId.get(n.parent_id)!.children.push(n);
      else roots.push(n);
    });

    // Roll counts up.
    const roll = (n: N): number => {
      let sum = n.count;
      for (const c of n.children) sum += roll(c as N);
      n.count = sum;
      return sum;
    };
    roots.forEach(roll);

    // Strip parent_id from response + sort children by count desc, name asc.
    // Prune any node (at any depth) whose rolled-up count is 0.
    const clean = (n: N): CategoryTreeNode => ({
      id: n.id,
      slug: n.slug,
      name: n.name,
      count: n.count,
      children: n.children
        .filter((c) => (c as N).count > 0)
        .map((c) => clean(c as N))
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "de")),
    });
    return roots
      .filter((r) => r.count > 0)
      .map(clean)
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "de"));
  },
);

// Top level-2 (sub) categories with the most products — used by the header
// as a dynamic navigation strip. Returns up to 5 sub-categories with their
// parent slug so we can link into /kategorie/$parent/$child.
export type TopSubCategoryLink = {
  slug: string;
  name: string;
  parentSlug: string;
  count: number;
};

export const getTopSubCategoryLinks = createServerFn({ method: "GET" }).handler(
  async (): Promise<TopSubCategoryLink[]> => {
    const supabase = anonClient();
    const { data: subs, error } = await supabase
      .from("categories")
      .select("id, slug, name, parent_id")
      .not("parent_id", "is", null);
    if (error) throw new Error(error.message);
    const subRows = (subs ?? []) as Array<{
      id: string;
      slug: string;
      name: string;
      parent_id: string;
    }>;
    if (subRows.length === 0) return [];

    const parentIds = [...new Set(subRows.map((s) => s.parent_id))];
    const { data: parents } = await supabase
      .from("categories")
      .select("id, slug")
      .in("id", parentIds);
    const parentSlugById = new Map(
      (parents ?? []).map((p) => [p.id as string, p.slug as string]),
    );

    const withCounts: TopSubCategoryLink[] = [];
    for (const s of subRows) {
      const { count } = await supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("category_id", s.id);
      const n = count ?? 0;
      if (n === 0) continue;
      const parentSlug = parentSlugById.get(s.parent_id);
      if (!parentSlug) continue;
      withCounts.push({ slug: s.slug, name: s.name, parentSlug, count: n });
    }
    withCounts.sort((a, b) => b.count - a.count);
    return withCounts.slice(0, 5);
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

    // Load all categories once (tree is small) so a child slug can resolve to
    // any descendant of the parent, not just a direct child. This fixes the
    // "menu leaf routes to top parent" bug when subcategories are 3 levels deep.
    const { data: allCats, error: allErr } = await supabase
      .from("categories")
      .select("id, parent_id, slug, name, keepa_category_id, seo_title, seo_description, intro_md, outro_md, sort");
    if (allErr) throw new Error(allErr.message);
    const rows = (allCats ?? []) as CategoryRow[];

    const parentRow = rows.find((r) => !r.parent_id && r.slug === data.parent);
    if (!parentRow) return null;

    // Descendant lookup: any category whose ancestor chain contains parentRow
    const parentOf = new Map(rows.map((r) => [r.id, r.parent_id] as const));
    const isDescendantOf = (id: string, rootId: string): boolean => {
      let cur: string | null | undefined = id;
      for (let i = 0; i < 10 && cur; i += 1) {
        if (cur === rootId) return true;
        cur = parentOf.get(cur) ?? null;
      }
      return false;
    };

    let current: CategoryRow = parentRow;
    const breadcrumb: CategoryRow[] = [parentRow];

    if (data.child) {
      const candidates = rows.filter((r) => r.slug === data.child && r.id !== parentRow.id);
      const match = candidates.find((r) => isDescendantOf(r.id, parentRow.id));
      if (!match) return null;
      current = match;
      // Build full breadcrumb from parentRow down to current
      const chain: CategoryRow[] = [];
      let cur: CategoryRow | undefined = match;
      while (cur && cur.id !== parentRow.id) {
        chain.unshift(cur);
        const pid: string | null = parentOf.get(cur.id) ?? null;
        cur = pid ? rows.find((r) => r.id === pid) : undefined;
      }
      breadcrumb.push(...chain);
    }

    // Direct children (further navigation)
    const children = rows
      .filter((r) => r.parent_id === current.id)
      .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0) || a.name.localeCompare(b.name, "de"));

    // Include all descendants when fetching offers
    const catIds = new Set<string>([current.id]);
    let added = true;
    while (added) {
      added = false;
      for (const r of rows) {
        if (r.parent_id && catIds.has(r.parent_id) && !catIds.has(r.id)) {
          catIds.add(r.id);
          added = true;
        }
      }
    }

    const { data: offers, error: oErr } = await supabase
      .from("offers")
      .select(
        "id, external_id, condition, price_cents, list_price_cents, avg_price_30d_cents, avg_price_90d_cents, currency, in_stock, first_seen_at, country_code, discount_percent, shop_id, product:products!inner(id, asin, title, brand, image_url, category, category_id), shop:shops!inner(slug)",
      )
      .eq("in_stock", true)
      .in("product.category_id", Array.from(catIds))
      .order("discount_percent", { ascending: false, nullsFirst: false })
      .limit(500);
    if (oErr) throw new Error(oErr.message);
    const deals: Deal[] = (offers ?? [])
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

    return {
      category: current,
      breadcrumb,
      childCategories: children as CategoryRow[],
      deals,
    };
  });
