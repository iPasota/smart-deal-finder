// Backfill categories for products that were imported without a category.
// Uses Keepa /product to fetch categoryTree and inserts/links category rows.
// Prioritizes products with active in-stock offers so the menu grows first
// where users actually land.
//
// Route: /api/public/hooks/keepa-backfill-categories
// Auth: same as keepa-sync (apikey header OR Bearer KEEPA_SYNC_SECRET).

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { fetchProducts } from "@/lib/keepa.server";
import { slugify } from "@/lib/categories";

type CatCache = Map<number, string>;

async function loadAdmin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function upsertCategoryPath(
  supabaseAdmin: Awaited<ReturnType<typeof loadAdmin>>,
  tree: Array<{ catId: number; name: string }> | undefined,
  cache: CatCache,
): Promise<string | null> {
  if (!tree || tree.length === 0) return null;
  const top = tree[0];
  const sub = tree.length > 1 ? tree[1] : null;

  const ensure = async (
    entry: { catId: number; name: string },
    parentId: string | null,
  ): Promise<string> => {
    const cached = cache.get(entry.catId);
    if (cached) return cached;
    const { data: byKeepa } = await supabaseAdmin
      .from("categories")
      .select("id")
      .eq("keepa_category_id", entry.catId)
      .maybeSingle();
    if (byKeepa?.id) {
      cache.set(entry.catId, byKeepa.id);
      return byKeepa.id;
    }
    const slug = slugify(entry.name);
    let q = supabaseAdmin.from("categories").select("id").eq("slug", slug);
    q = parentId ? q.eq("parent_id", parentId) : q.is("parent_id", null);
    const { data: bySlug } = await q.maybeSingle();
    if (bySlug?.id) {
      await supabaseAdmin
        .from("categories")
        .update({ keepa_category_id: entry.catId })
        .eq("id", bySlug.id);
      cache.set(entry.catId, bySlug.id);
      return bySlug.id;
    }
    const { data: inserted, error } = await supabaseAdmin
      .from("categories")
      .insert({ parent_id: parentId, slug, name: entry.name, keepa_category_id: entry.catId })
      .select("id")
      .single();
    if (error) throw new Error(`category upsert ${entry.name}: ${error.message}`);
    cache.set(entry.catId, inserted.id);
    return inserted.id;
  };

  const topId = await ensure(top, null);
  if (!sub) return topId;
  try {
    return await ensure(sub, topId);
  } catch {
    return topId;
  }
}

const BodySchema = z
  .object({
    // Keepa /product costs ~2 tokens per ASIN with stats=0. 400 ASINs ≈ 800 tokens.
    limit: z.number().int().min(1).max(400).default(200),
    // Prefer products with in-stock offers first (visible to users).
    inStockOnly: z.boolean().default(true),
    triggeredBy: z.enum(["cron", "manual", "admin"]).default("cron"),
  })
  .default({});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/public/hooks/keepa-backfill-categories")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
        const bearerSecret = process.env.KEEPA_SYNC_SECRET;
        const apiKeyHeader = request.headers.get("apikey");
        const auth = request.headers.get("authorization") ?? "";
        const bearerToken = auth.startsWith("Bearer ") ? auth.slice(7) : "";
        const apiKeyOk = !!publishableKey && apiKeyHeader === publishableKey;
        const bearerOk = !!bearerSecret && bearerToken === bearerSecret;
        if (!apiKeyOk && !bearerOk) return json({ error: "unauthorized" }, 401);

        let body: unknown = {};
        try { body = await request.json(); } catch { body = {}; }
        const parsed = BodySchema.safeParse(body);
        if (!parsed.success) return json({ error: "bad input", details: parsed.error.flatten() }, 400);
        const opts = parsed.data;

        const supabaseAdmin = await loadAdmin();
        const startedAt = new Date();
        const catCache: CatCache = new Map();
        const errors: Array<{ msg: string }> = [];

        const { data: logRow } = await supabaseAdmin
          .from("keepa_sync_log")
          .insert({ sync_type: "category_backfill", status: "running", triggered_by: opts.triggeredBy })
          .select("id")
          .single();
        const logId = logRow?.id;

        // 1) Pick candidate ASINs. Prefer products with active offers.
        let asins: string[] = [];
        if (opts.inStockOnly) {
          const { data: offerRows } = await supabaseAdmin
            .from("offers")
            .select("product:products!inner(asin, category_id)")
            .eq("in_stock", true)
            .is("product.category_id", null)
            .limit(opts.limit * 2) // over-fetch to dedupe
            .returns<Array<{ product: { asin: string | null; category_id: string | null } | null }>>();
          const set = new Set<string>();
          for (const r of offerRows ?? []) {
            const a = r.product?.asin;
            if (a && /^B[A-Z0-9]{9}$/.test(a)) set.add(a);
            if (set.size >= opts.limit) break;
          }
          asins = [...set];
        }
        if (asins.length < opts.limit) {
          const { data: rest } = await supabaseAdmin
            .from("products")
            .select("asin")
            .is("category_id", null)
            .not("asin", "is", null)
            .limit(opts.limit - asins.length);
          for (const p of rest ?? []) {
            const a = p.asin as string | null;
            if (a && /^B[A-Z0-9]{9}$/.test(a) && !asins.includes(a)) asins.push(a);
          }
        }

        if (asins.length === 0) {
          if (logId) {
            await supabaseAdmin
              .from("keepa_sync_log")
              .update({
                status: "success",
                finished_at: new Date().toISOString(),
                duration_ms: Date.now() - startedAt.getTime(),
              })
              .eq("id", logId);
          }
          return json({ ok: true, processed: 0, updated: 0, reason: "no_candidates" });

        }

        // 2) Fetch product details in chunks of 100.
        let processed = 0;
        let updated = 0;
        let deletedBooks = 0;
        for (let i = 0; i < asins.length; i += 100) {
          const chunk = asins.slice(i, i + 100);
          try {
            const res = await fetchProducts(chunk, { stats: 0, history: 0 });
            for (const p of res.products) {
              processed++;
              // Skip / prune book-like products (mirror keepa-sync policy).
              const pg = (p.productGroup ?? "").toLowerCase();
              const isBook = pg.includes("book") || pg.includes("ebook") || pg.includes("audible") || pg.includes("dvd") || pg.includes("music") || pg.includes("software");
              if (isBook) {
                const { data: prodRow } = await supabaseAdmin
                  .from("products").select("id").eq("asin", p.asin).maybeSingle();
                if (prodRow?.id) {
                  await supabaseAdmin.from("offers").delete().eq("product_id", prodRow.id);
                  await supabaseAdmin.from("products").delete().eq("id", prodRow.id);
                  deletedBooks++;
                }
                continue;
              }
              let categoryId: string | null = null;
              let categoryName: string | null = null;
              if (p.categoryTree && p.categoryTree.length > 0) {
                categoryName = p.categoryTree[p.categoryTree.length - 1]?.name ?? null;
                try {
                  categoryId = await upsertCategoryPath(supabaseAdmin, p.categoryTree, catCache);
                } catch (err) {
                  errors.push({ msg: `cat ${p.asin}: ${err instanceof Error ? err.message : String(err)}` });
                }
              }
              if (!categoryId) continue;
              const { error: upErr } = await supabaseAdmin
                .from("products")
                .update({
                  category_id: categoryId,
                  category: categoryName ?? undefined,
                  keepa_category_id: p.rootCategory ?? undefined,
                  brand: p.brand ?? p.manufacturer ?? undefined,
                  keepa_last_refreshed_at: new Date().toISOString(),
                })
                .eq("asin", p.asin);
              if (upErr) errors.push({ msg: `update ${p.asin}: ${upErr.message}` });
              else updated++;
            }
          } catch (err) {
            errors.push({ msg: `chunk ${i}: ${err instanceof Error ? err.message : String(err)}` });
            break;
          }
        }

        if (logId) {
          await supabaseAdmin
            .from("keepa_sync_log")
            .update({
              status: errors.length > 0 && updated === 0 ? "failed" : "success",
              finished_at: new Date().toISOString(),
              duration_ms: Date.now() - startedAt.getTime(),
              deals_fetched: processed,
              products_inserted: updated,
              errors: errors.length > 0 ? errors.slice(0, 20) : null,
            })
            .eq("id", logId);

        }

        return json({ ok: true, candidates: asins.length, processed, updated, deletedBooks, errors: errors.slice(0, 5) });
      },
    },
  },
});
