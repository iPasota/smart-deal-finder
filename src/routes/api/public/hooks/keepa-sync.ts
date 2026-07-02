// Keepa sync endpoint. Called by pg_cron and by admin trigger button.
// Route: /api/public/hooks/keepa-sync
//
// Security: bypasses Lovable-published auth (public prefix), so we verify
// the caller ourselves with a shared secret in the Authorization header.
// Cron uses the Supabase anon key (apikey header) plus a bearer token from
// the KEEPA_SYNC_SECRET env var.

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import {
  fetchWarehouseDealsPage,
  fetchProducts,
  keepaPrice,
  tokenStatus,
  type KeepaDealsResponse,
} from "@/lib/keepa.server";

const BodySchema = z
  .object({
    maxPages: z.number().int().min(1).max(20).default(4),
    triggeredBy: z.enum(["cron", "manual", "admin"]).default("cron"),
    minDiscount: z.number().int().min(1).max(99).default(15),
    enrichNewAsins: z.boolean().default(true),
    maxEnrich: z.number().int().min(0).max(500).default(100),
  })
  .default({});

const AMAZON_WAREHOUSE_SLUG = "amazon-warehouse";

// Map Keepa condition code → our internal condition label.
// Keepa /deal warehouse rows don't split by condition directly — we use
// the returned condition from the offers if available; default to "Used - Very Good".
const CONDITION_LABEL = "Used - Very Good";

export const Route = createFileRoute("/api/public/hooks/keepa-sync")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // 1) Auth guard
        const expected = process.env.KEEPA_SYNC_SECRET;
        if (!expected) {
          return json({ error: "KEEPA_SYNC_SECRET not configured" }, 500);
        }
        const auth = request.headers.get("authorization") ?? "";
        const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
        if (token !== expected) {
          return json({ error: "unauthorized" }, 401);
        }

        // 2) Parse input
        let body: unknown = {};
        try {
          body = await request.json();
        } catch {
          body = {};
        }
        const parsed = BodySchema.safeParse(body);
        if (!parsed.success) {
          return json({ error: "bad input", details: parsed.error.flatten() }, 400);
        }
        const opts = parsed.data;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // 3) Start log row
        const startedAt = new Date();
        const { data: logRow, error: logErr } = await supabaseAdmin
          .from("keepa_sync_log")
          .insert({
            sync_type: "deal_scan",
            status: "running",
            triggered_by: opts.triggeredBy,
          })
          .select("id")
          .single();
        if (logErr) {
          console.error("[keepa-sync] cannot insert log", logErr);
          return json({ error: "log insert failed" }, 500);
        }
        const logId = logRow.id;

        // 4) Resolve amazon-warehouse shop_id (needed for offers upsert)
        const { data: shopRow } = await supabaseAdmin
          .from("shops")
          .select("id")
          .eq("slug", AMAZON_WAREHOUSE_SLUG)
          .maybeSingle();
        if (!shopRow) {
          await finishLog(supabaseAdmin, logId, startedAt, {
            status: "failed",
            errors: [{ msg: "shop 'amazon-warehouse' not found" }],
          });
          return json({ error: "shop not seeded" }, 500);
        }
        const shopId = shopRow.id as string;

        // 5) Fetch deal pages
        const errors: Array<{ page?: number; msg: string }> = [];
        const dealsByAsin = new Map<string, KeepaDealsResponse["dr"][number]>();

        for (let page = 0; page < opts.maxPages; page++) {
          try {
            const res = await fetchWarehouseDealsPage(page, {
              deltaPercentRange: [opts.minDiscount, 100],
            });
            const rows = res.dr ?? [];
            for (const row of rows) {
              if (!dealsByAsin.has(row.asin)) dealsByAsin.set(row.asin, row);
            }
            if (rows.length < 150) break; // last page
          } catch (err) {
            errors.push({ page, msg: err instanceof Error ? err.message : String(err) });
            break;
          }
        }

        // 6) Upsert products + offers
        let productsInserted = 0;
        let offersUpserted = 0;
        const newAsinsForEnrichment: string[] = [];

        // Get existing products by ASIN in bulk
        const asins = [...dealsByAsin.keys()];
        const { data: existingProducts } = await supabaseAdmin
          .from("products")
          .select("id, asin, keepa_last_refreshed_at")
          .in("asin", asins);
        const productByAsin = new Map(
          (existingProducts ?? []).map((p) => [p.asin as string, p]),
        );

        for (const [asin, deal] of dealsByAsin) {
          const whdPrice = keepaPrice(deal.current?.[7]);
          const listPrice = keepaPrice(deal.current?.[4]) ?? keepaPrice(deal.current?.[1]);
          if (whdPrice === null) continue;

          const discount = deal.deltaPercent?.[7] ?? null;

          let productId = productByAsin.get(asin)?.id as string | undefined;
          if (!productId) {
            const { data: inserted, error } = await supabaseAdmin
              .from("products")
              .insert({
                asin,
                title: deal.title ?? asin,
                image_url: deal.image
                  ? `https://images-na.ssl-images-amazon.com/images/I/${deal.image}`
                  : null,
                keepa_category_id: deal.rootCategory ?? null,
                category: deal.categoryTree?.[deal.categoryTree.length - 1]?.name ?? null,
              })
              .select("id")
              .single();
            if (error) {
              errors.push({ msg: `product insert ${asin}: ${error.message}` });
              continue;
            }
            productId = inserted.id;
            productsInserted++;
            newAsinsForEnrichment.push(asin);
          }

          const { error: offerErr } = await supabaseAdmin.from("offers").upsert(
            {
              product_id: productId,
              shop_id: shopId,
              country_code: "DE",
              external_id: asin,
              condition: CONDITION_LABEL,
              price_cents: whdPrice,
              list_price_cents: listPrice,
              currency: "EUR",
              in_stock: true,
              keepa_domain_id: 3,
              discount_percent: discount,
              avg_price_30d_cents: keepaPrice(deal.avg?.[7]),
              avg_price_90d_cents: keepaPrice(deal.avg90?.[7]),
              last_seen_at: new Date().toISOString(),
            },
            { onConflict: "shop_id,external_id,condition,country_code" },
          );
          if (offerErr) {
            errors.push({ msg: `offer upsert ${asin}: ${offerErr.message}` });
            continue;
          }
          offersUpserted++;
        }

        // 7) Optionally enrich new ASINs with product details (EAN, brand, salesRank)
        let enriched = 0;
        if (opts.enrichNewAsins && newAsinsForEnrichment.length > 0) {
          const toEnrich = newAsinsForEnrichment.slice(0, opts.maxEnrich);
          const chunks: string[][] = [];
          for (let i = 0; i < toEnrich.length; i += 100) {
            chunks.push(toEnrich.slice(i, i + 100));
          }
          for (const chunk of chunks) {
            try {
              const res = await fetchProducts(chunk, { stats: 90, history: 0 });
              for (const p of res.products) {
                const ean = p.eanList?.[0] ?? null;
                const salesRank = p.stats?.current?.[3] ?? null;
                await supabaseAdmin
                  .from("products")
                  .update({
                    brand: p.brand ?? p.manufacturer ?? null,
                    gtin: ean,
                    sales_rank: salesRank && salesRank > 0 ? salesRank : null,
                    keepa_last_refreshed_at: new Date().toISOString(),
                  })
                  .eq("asin", p.asin);
                enriched++;
              }
            } catch (err) {
              errors.push({ msg: `enrich chunk: ${err instanceof Error ? err.message : String(err)}` });
              break;
            }
          }
        }

        // 8) Finalize log
        const { tokensLeft, refillRate } = tokenStatus();
        await finishLog(supabaseAdmin, logId, startedAt, {
          status: errors.length === 0 ? "success" : "partial",
          errors: errors.length ? errors : null,
          deals_fetched: dealsByAsin.size,
          products_inserted: productsInserted,
          offers_upserted: offersUpserted,
          tokens_left: tokensLeft,
          refill_rate: refillRate,
        });

        return json({
          ok: true,
          logId,
          dealsFetched: dealsByAsin.size,
          productsInserted,
          offersUpserted,
          enriched,
          tokensLeft,
          errorsCount: errors.length,
        });
      },
    },
  },
});

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

type LogUpdate = {
  status: string;
  errors?: unknown;
  deals_fetched?: number;
  products_inserted?: number;
  offers_upserted?: number;
  tokens_left?: number;
  refill_rate?: number;
};

async function finishLog(
  admin: Awaited<ReturnType<typeof import("@/integrations/supabase/client.server").supabaseAdmin.from>>["_" & keyof never] extends never
    ? never
    : never,
  _logId: string,
  _startedAt: Date,
  _update: LogUpdate,
): Promise<void>;
async function finishLog(
  admin: unknown,
  logId: string,
  startedAt: Date,
  update: LogUpdate,
): Promise<void> {
  const finishedAt = new Date();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin as any)
    .from("keepa_sync_log")
    .update({
      ...update,
      finished_at: finishedAt.toISOString(),
      duration_ms: finishedAt.getTime() - startedAt.getTime(),
    })
    .eq("id", logId);
}
