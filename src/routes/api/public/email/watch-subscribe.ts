import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const PUBLIC_ORIGIN = "https://whdfinder.com";

const schema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  asin: z.string().trim().regex(/^[A-Z0-9]{10}$/i).max(10),
  productTitle: z.string().min(1).max(500),
  productImageUrl: z.string().url().max(1000).optional().nullable(),
  productBrand: z.string().max(200).optional().nullable(),
  targetPriceCents: z.number().int().min(1).max(100_000_000),
  currentPriceCents: z.number().int().min(0).max(100_000_000).optional().nullable(),
  condition: z.string().max(50),
});

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function formatEUR(cents: number): string {
  return `${(cents / 100).toFixed(2).replace(".", ",")} €`;
}

export const Route = createFileRoute("/api/public/email/watch-subscribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let parsed;
        try {
          parsed = schema.parse(await request.json());
        } catch (err) {
          return Response.json({ error: err instanceof Error ? err.message : "Invalid input" }, { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { enqueueDbEmail } = await import("@/lib/email/enqueue.server");

        // Suppression check up-front to avoid creating a stale token
        const { data: sup } = await supabaseAdmin
          .from("suppressed_emails")
          .select("id")
          .eq("email", parsed.email)
          .maybeSingle();
        if (sup) {
          return Response.json({ success: false, reason: "suppressed" });
        }

        // Reuse existing pending row for same email+asin, else insert fresh
        const { data: existing } = await supabaseAdmin
          .from("email_watches")
          .select("id, doi_token, confirmed_at, unsubscribed_at")
          .eq("email", parsed.email)
          .eq("asin", parsed.asin)
          .is("unsubscribed_at", null)
          .maybeSingle();

        let doiToken: string;
        if (existing && !existing.confirmed_at) {
          doiToken = existing.doi_token;
          await supabaseAdmin
            .from("email_watches")
            .update({
              target_price_cents: parsed.targetPriceCents,
              current_price_cents: parsed.currentPriceCents ?? null,
              product_title: parsed.productTitle,
              product_image_url: parsed.productImageUrl ?? null,
              product_brand: parsed.productBrand ?? null,
              condition: parsed.condition,
            })
            .eq("id", existing.id);
        } else if (existing && existing.confirmed_at) {
          // Already confirmed — just update target
          await supabaseAdmin
            .from("email_watches")
            .update({ target_price_cents: parsed.targetPriceCents, last_triggered_at: null })
            .eq("id", existing.id);
          return Response.json({ success: true, alreadyConfirmed: true });
        } else {
          doiToken = generateToken();
          const { error: insErr } = await supabaseAdmin.from("email_watches").insert({
            email: parsed.email,
            asin: parsed.asin,
            product_title: parsed.productTitle,
            product_image_url: parsed.productImageUrl ?? null,
            product_brand: parsed.productBrand ?? null,
            target_price_cents: parsed.targetPriceCents,
            current_price_cents: parsed.currentPriceCents ?? null,
            condition: parsed.condition,
            doi_token: doiToken,
          });
          if (insErr) {
            console.error("email_watches insert failed", insErr);
            return Response.json({ error: "Konnte Preiswecker nicht speichern" }, { status: 500 });
          }
        }

        const confirmUrl = `${PUBLIC_ORIGIN}/api/public/email/confirm?token=${doiToken}`;
        try {
          await enqueueDbEmail({
            templateName: "doi-confirmation",
            recipientEmail: parsed.email,
            idempotencyKey: `doi-${doiToken}-${Date.now()}`,
            variables: {
              product_title: parsed.productTitle,
              target_price: formatEUR(parsed.targetPriceCents),
              confirm_url: confirmUrl,
            },
          });
        } catch (err) {
          console.error("DOI mail enqueue failed", err);
          // Still return success — user can request resend
        }

        return Response.json({ success: true });
      },
    },
  },
});
