// Keepa price-refresh endpoint. Called by pg_cron.
// Route: /api/public/hooks/keepa-refresh
//
// Picks the offers with the oldest last_seen_at (warehouse, in_stock=true),
// calls Keepa /product to get the current warehouse price, and updates the
// offer. Offers whose warehouse price has disappeared are marked out-of-stock.
//
// Security: same auth pattern as keepa-sync (apikey header OR bearer).

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { fetchProducts, keepaPrice, tokenStatus } from "@/lib/keepa.server";
import { priceIndexForCondition } from "@/lib/keepa-conditions";

const BodySchema = z
  .object({
    batchSize: z.number().int().min(1).max(300).default(200),
    triggeredBy: z.enum(["cron", "manual", "admin"]).default("cron"),
    // If an offer hasn't been seen in this many hours AND the refresh returns
    // no warehouse price, we mark it out of stock.
    staleAfterHours: z.number().int().min(1).max(240).default(6),
  })
  .default({});

const AMAZON_WAREHOUSE_SLUG = "amazon-warehouse";

async function loadAdmin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export const Route = createFileRoute("/api/public/hooks/keepa-refresh")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // 1) Auth — require the private KEEPA_SYNC_SECRET as a Bearer token.
        //    The Supabase publishable key is NOT accepted (it ships in the
        //    browser bundle).
        const bearerSecret = process.env.KEEPA_SYNC_SECRET;
        const auth = request.headers.get("authorization") ?? "";
        const bearerToken = auth.startsWith("Bearer ") ? auth.slice(7) : "";
        const bearerOk = !!bearerSecret && bearerToken === bearerSecret;
        if (!bearerOk) return json({ error: "unauthorized" }, 401);

        // 2) Input
        let body: unknown = {};
        try {
          body = await request.json();
        } catch {
          body = {};
        }
        const parsed = BodySchema.safeParse(body);
        if (!parsed.success) return json({ error: "bad input" }, 400);
        const opts = parsed.data;

        const supabaseAdmin = await loadAdmin();
        const startedAt = new Date();

        // Overlap guard (5 min window).
        const runningSince = new Date(Date.now() - 5 * 60_000).toISOString();
        const staleBefore = new Date(Date.now() - 5 * 60_000).toISOString();
        await supabaseAdmin
          .from("keepa_sync_log")
          .update({
            status: "failed",
            errors: [{ msg: "refresh timed out" }],
            finished_at: new Date().toISOString(),
          })
          .eq("sync_type", "price_refresh")
          .eq("status", "running")
          .lt("started_at", staleBefore);
        const { data: activeRun } = await supabaseAdmin
          .from("keepa_sync_log")
          .select("id")
          .eq("sync_type", "price_refresh")
          .eq("status", "running")
          .gte("started_at", runningSince)
          .limit(1)
          .maybeSingle();
        if (activeRun) return json({ ok: true, skipped: true });

        const { data: logRow, error: logErr } = await supabaseAdmin
          .from("keepa_sync_log")
          .insert({
            sync_type: "price_refresh",
            status: "running",
            triggered_by: opts.triggeredBy,
          })
          .select("id")
          .single();
        if (logErr) return json({ error: "log insert failed" }, 500);
        const logId = logRow.id;

        // 3) Shop id
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
          return json({ error: "shop missing" }, 500);
        }
        const shopId = shopRow.id as string;

        // 4) Pick oldest-seen in-stock warehouse offers.
        const { data: staleOffers, error: pickErr } = await supabaseAdmin
          .from("offers")
          .select("id, external_id, product_id, condition, last_seen_at, price_cents")
          .eq("shop_id", shopId)
          .eq("in_stock", true)
          .order("last_seen_at", { ascending: true, nullsFirst: true })
          .limit(opts.batchSize);
        if (pickErr) {
          await finishLog(supabaseAdmin, logId, startedAt, {
            status: "failed",
            errors: [{ msg: `pick offers: ${pickErr.message}` }],
          });
          return json({ error: "pick failed" }, 500);
        }
        const offers = staleOffers ?? [];
        if (offers.length === 0) {
          await finishLog(supabaseAdmin, logId, startedAt, {
            status: "success",
            deals_fetched: 0,
            offers_upserted: 0,
          });
          return json({ ok: true, refreshed: 0 });
        }

        // 5) Chunked fetch (100/chunk).
        const errors: Array<{ msg: string }> = [];
        let refreshed = 0;
        let markedOOS = 0;
        const nowIso = new Date().toISOString();
        const staleCutoff = Date.now() - opts.staleAfterHours * 3_600_000;

        const asins = offers.map((o) => o.external_id as string);
        const asinToOffer = new Map(offers.map((o) => [o.external_id as string, o]));

        for (let i = 0; i < asins.length; i += 100) {
          const chunk = asins.slice(i, i + 100);
          try {
            const res = await fetchProducts(chunk, { stats: 90, history: 0 });
            const returned = new Set<string>();
            for (const p of res.products) {
              returned.add(p.asin);
              const offer = asinToOffer.get(p.asin);
              if (!offer) continue;

              const condition = (offer.condition as string | null) ?? "Used - Very Good";
              const priceIndex = priceIndexForCondition(condition);
              const whd =
                keepaPrice(p.stats?.current?.[priceIndex]) ??
                (condition === "Used - Very Good" ? keepaPrice(p.stats?.current?.[9]) : null);
              const list =
                keepaPrice(p.stats?.current?.[4]) ??
                keepaPrice(p.stats?.current?.[1]);
              const avg30 = keepaPrice(p.stats?.avg30?.[priceIndex]) ?? keepaPrice(p.stats?.avg30?.[9]);
              const avg90 = keepaPrice(p.stats?.avg90?.[priceIndex]) ?? keepaPrice(p.stats?.avg90?.[9]);

              if (whd === null || whd <= 0) {
                // No warehouse price → out of stock.
                const lastSeenMs = offer.last_seen_at
                  ? new Date(offer.last_seen_at as string).getTime()
                  : 0;
                if (lastSeenMs < staleCutoff) {
                  await supabaseAdmin
                    .from("offers")
                    .update({ in_stock: false, last_seen_at: nowIso })
                    .eq("id", offer.id);
                  markedOOS++;
                } else {
                  // Bump last_seen so we don't re-pick immediately.
                  await supabaseAdmin
                    .from("offers")
                    .update({ last_seen_at: nowIso })
                    .eq("id", offer.id);
                }
                continue;
              }

              const discount =
                list && list > whd ? Math.round(((list - whd) / list) * 100) : null;

              await supabaseAdmin
                .from("offers")
                .update({
                  price_cents: whd,
                  list_price_cents: list,
                  avg_price_30d_cents: avg30,
                  avg_price_90d_cents: avg90,
                  discount_percent: discount,
                  in_stock: true,
                  last_seen_at: nowIso,
                })
                .eq("id", offer.id);
              refreshed++;
            }
            // ASINs Keepa didn't return for (very rare) — bump timestamp so we
            // don't get stuck on them.
            for (const asin of chunk) {
              if (returned.has(asin)) continue;
              const offer = asinToOffer.get(asin);
              if (!offer) continue;
              await supabaseAdmin
                .from("offers")
                .update({ last_seen_at: nowIso })
                .eq("id", offer.id);
            }
          } catch (err) {
            errors.push({ msg: `chunk ${i}: ${err instanceof Error ? err.message : String(err)}` });
            break;
          }
        }

        const { tokensLeft, refillRate } = tokenStatus();
        await finishLog(supabaseAdmin, logId, startedAt, {
          status: errors.length === 0 ? "success" : "partial",
          errors: errors.length ? errors : null,
          deals_fetched: offers.length,
          offers_upserted: refreshed,
          tokens_left: tokensLeft,
          refill_rate: refillRate,
        });

        return json({
          ok: true,
          logId,
          picked: offers.length,
          refreshed,
          markedOutOfStock: markedOOS,
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
  offers_upserted?: number;
  tokens_left?: number;
  refill_rate?: number;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function finishLog(admin: any, logId: string, startedAt: Date, update: LogUpdate): Promise<void> {
  const finishedAt = new Date();
  await admin
    .from("keepa_sync_log")
    .update({
      ...update,
      finished_at: finishedAt.toISOString(),
      duration_ms: finishedAt.getTime() - startedAt.getTime(),
    })
    .eq("id", logId);
}
