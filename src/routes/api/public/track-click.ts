import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const BodySchema = z.object({
  dealId: z.string().min(1).max(128),
  shop: z.string().min(1).max(64),
  position: z.enum(["primary", "alternative"]).default("primary"),
});

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
} as const;

export const Route = createFileRoute("/api/public/track-click")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        let payload: unknown;
        try {
          payload = await request.json();
        } catch {
          return new Response("Bad JSON", { status: 400, headers: CORS });
        }

        const parsed = BodySchema.safeParse(payload);
        if (!parsed.success) {
          return new Response("Invalid payload", { status: 400, headers: CORS });
        }

        // Best-effort, coarse metadata — no IP, no user id, no user agent.
        const country =
          request.headers.get("cf-ipcountry") ??
          request.headers.get("x-vercel-ip-country") ??
          null;

        let referrerHost: string | null = null;
        const ref = request.headers.get("referer");
        if (ref) {
          try {
            referrerHost = new URL(ref).host;
          } catch {
            referrerHost = null;
          }
        }

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { error } = await supabaseAdmin.from("affiliate_clicks").insert({
            deal_id: parsed.data.dealId,
            shop: parsed.data.shop,
            position: parsed.data.position,
            country,
            referrer_host: referrerHost,
          });
          if (error) {
            console.error("[track-click] insert failed", error);
            return new Response("Insert failed", { status: 500, headers: CORS });
          }
        } catch (err) {
          console.error("[track-click] unexpected", err);
          return new Response("Server error", { status: 500, headers: CORS });
        }

        return new Response(null, { status: 204, headers: CORS });
      },
    },
  },
});
