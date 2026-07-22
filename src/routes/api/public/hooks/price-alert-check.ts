import { createFileRoute } from "@tanstack/react-router";
import { buildDeeplink } from "@/lib/affiliate";

function formatEUR(cents: number): string {
  return `${(cents / 100).toFixed(2).replace(".", ",")} €`;
}

function isAuthorized(request: Request): boolean {
  const secret = process.env.EMAIL_HOOK_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  const token = header.replace(/^Bearer\s+/i, "").trim();
  return token === secret;
}

interface WatchRow {
  id: string;
  email?: string | null;
  user_id?: string | null;
  asin: string;
  product_title: string;
  product_brand: string | null;
  target_price_cents: number;
  condition: string;
}

export const Route = createFileRoute("/api/public/hooks/price-alert-check")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!isAuthorized(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { enqueueDbEmail } = await import("@/lib/email/enqueue.server");

        const nowIso = new Date().toISOString();
        const cooldownMs = 24 * 60 * 60 * 1000;
        const cutoff = new Date(Date.now() - cooldownMs).toISOString();

        // 1. Confirmed guest watches
        const { data: guestWatches } = await supabaseAdmin
          .from("email_watches")
          .select("id, email, asin, product_title, product_brand, target_price_cents, condition, last_triggered_at")
          .not("confirmed_at", "is", null)
          .is("unsubscribed_at", null)
          .or(`last_triggered_at.is.null,last_triggered_at.lt.${cutoff}`)
          .limit(500);

        // 2. Signed-in user watches — get email via profiles
        const { data: userWatches } = await supabaseAdmin
          .from("watches")
          .select("id, user_id, asin, product_title, product_brand, target_price_cents, condition, last_triggered_at")
          .eq("active", true)
          .or(`last_triggered_at.is.null,last_triggered_at.lt.${cutoff}`)
          .limit(500);

        const allWatches: Array<WatchRow & { source: "guest" | "user"; last_triggered_at: string | null }> = [
          ...(guestWatches ?? []).map((w) => ({ ...w, source: "guest" as const })),
          ...(userWatches ?? []).map((w) => ({ ...w, source: "user" as const })),
        ];

        if (allWatches.length === 0) {
          return Response.json({ checked: 0, triggered: 0 });
        }

        // 3. Fetch current lowest offer per ASIN (offers link via product_id)
        const asins = Array.from(new Set(allWatches.map((w) => w.asin)));
        const { data: products } = await supabaseAdmin
          .from("products")
          .select("id, asin")
          .in("asin", asins);
        const asinByProductId = new Map<string, string>();
        const productIds: string[] = [];
        for (const p of products ?? []) {
          if (p.id && p.asin) { asinByProductId.set(p.id as string, p.asin as string); productIds.push(p.id as string); }
        }
        const cheapestByAsin = new Map<string, { price_cents: number; condition: string }>();
        if (productIds.length) {
          const { data: offers } = await supabaseAdmin
            .from("offers")
            .select("product_id, price_cents, condition")
            .in("product_id", productIds)
            .not("price_cents", "is", null);
          for (const o of offers ?? []) {
            const asin = asinByProductId.get(o.product_id as string);
            if (!asin || o.price_cents == null) continue;
            const cur = cheapestByAsin.get(asin);
            if (!cur || (o.price_cents as number) < cur.price_cents) {
              cheapestByAsin.set(asin, { price_cents: o.price_cents as number, condition: (o.condition as string) ?? "" });
            }
          }
        }

        // Resolve user emails once
        const userIds = Array.from(
          new Set(allWatches.filter((w) => w.source === "user" && w.user_id).map((w) => w.user_id!)),
        );
        const userEmailById = new Map<string, string>();
        if (userIds.length) {
          const { data: profiles } = await supabaseAdmin
            .from("profiles")
            .select("id, email")
            .in("id", userIds);
          for (const p of profiles ?? []) if (p.email) userEmailById.set(p.id as string, p.email as string);
        }

        let triggered = 0;
        const errors: string[] = [];

        for (const w of allWatches) {
          const cheapest = cheapestByAsin.get(w.asin);
          if (!cheapest) continue;
          if (cheapest.price_cents > w.target_price_cents) continue;

          const email = w.source === "guest" ? w.email : userEmailById.get(w.user_id ?? "");
          if (!email) continue;

          try {
            await enqueueDbEmail({
              templateName: "price-alert",
              recipientEmail: email,
              idempotencyKey: `alert-${w.source}-${w.id}-${cheapest.price_cents}`,
              variables: {
                product_title: w.product_title,
                current_price: formatEUR(cheapest.price_cents),
                target_price: formatEUR(w.target_price_cents),
                deal_url: buildDeeplink(w.asin),
                condition: cheapest.condition || w.condition,
                brand: w.product_brand ?? "",
              },
            });

            const table = w.source === "guest" ? "email_watches" : "watches";
            await supabaseAdmin.from(table).update({ last_triggered_at: nowIso }).eq("id", w.id);
            triggered++;
          } catch (err) {
            errors.push(`${w.id}: ${err instanceof Error ? err.message : "unknown"}`);
          }
        }

        return Response.json({ checked: allWatches.length, triggered, errors: errors.slice(0, 10) });
      },
    },
  },
});
