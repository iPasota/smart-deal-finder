import { createFileRoute } from "@tanstack/react-router";

function isAuthorized(request: Request): boolean {
  const secret = process.env.EMAIL_HOOK_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  return header.replace(/^Bearer\s+/i, "").trim() === secret;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

export const Route = createFileRoute("/api/public/hooks/admin-daily-digest")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!isAuthorized(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });

        const adminEmail = process.env.ADMIN_DIGEST_EMAIL;
        if (!adminEmail) return Response.json({ error: "ADMIN_DIGEST_EMAIL not set" }, { status: 500 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { enqueueDbEmail } = await import("@/lib/email/enqueue.server");

        const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

        // New products in last 24h with category name + best offer condition
        const { data: newOffers } = await supabaseAdmin
          .from("offers")
          .select("asin, condition, price_cents, created_at, products!inner(title, categories(name))")
          .gte("created_at", since)
          .limit(5000);

        // Aggregate: category → condition → count
        const agg = new Map<string, Map<string, number>>();
        const conditions = new Set<string>();
        for (const row of (newOffers ?? []) as any[]) {
          const cat = row.products?.categories?.name ?? "— unbekannt —";
          const cond = row.condition ?? "—";
          conditions.add(cond);
          const byCond = agg.get(cat) ?? new Map<string, number>();
          byCond.set(cond, (byCond.get(cond) ?? 0) + 1);
          agg.set(cat, byCond);
        }

        const condList = Array.from(conditions).sort();
        const rows: Array<{ cat: string; total: number; byCond: Map<string, number> }> = [];
        for (const [cat, byCond] of agg) {
          const total = Array.from(byCond.values()).reduce((a, b) => a + b, 0);
          rows.push({ cat, total, byCond });
        }
        rows.sort((a, b) => b.total - a.total);

        const thead = `<tr style="background:#f3f4f6"><th style="text-align:left;padding:6px 8px;border:1px solid #e5e7eb">Kategorie</th>${condList.map((c) => `<th style="text-align:right;padding:6px 8px;border:1px solid #e5e7eb">${escapeHtml(c)}</th>`).join("")}<th style="text-align:right;padding:6px 8px;border:1px solid #e5e7eb">Σ</th></tr>`;
        const tbody = rows.slice(0, 40).map((r) =>
          `<tr><td style="padding:6px 8px;border:1px solid #e5e7eb">${escapeHtml(r.cat)}</td>${condList.map((c) => `<td style="text-align:right;padding:6px 8px;border:1px solid #e5e7eb">${r.byCond.get(c) ?? 0}</td>`).join("")}<td style="text-align:right;padding:6px 8px;border:1px solid #e5e7eb"><strong>${r.total}</strong></td></tr>`,
        ).join("");
        const table = `<table style="border-collapse:collapse;width:100%;font-size:13px;border:1px solid #e5e7eb">${thead}${tbody || `<tr><td colspan="${condList.length + 2}" style="padding:12px;text-align:center;color:#6b7280">Keine neuen Produkte in den letzten 24h.</td></tr>`}</table>`;

        const totalNew = (newOffers ?? []).length;

        // Active watches count
        const { count: guestActive } = await supabaseAdmin
          .from("email_watches")
          .select("id", { count: "exact", head: true })
          .not("confirmed_at", "is", null)
          .is("unsubscribed_at", null);
        const { count: userActive } = await supabaseAdmin
          .from("watches")
          .select("id", { count: "exact", head: true })
          .eq("active", true);

        try {
          await enqueueDbEmail({
            templateName: "admin-daily-digest",
            recipientEmail: adminEmail,
            skipUnsubscribe: true,
            idempotencyKey: `digest-${new Date().toISOString().slice(0, 10)}`,
            variables: {
              new_count: String(totalNew),
              summary_table: table,
              guest_watches_active: String(guestActive ?? 0),
              user_watches_active: String(userActive ?? 0),
            },
          });
        } catch (err) {
          return Response.json({ error: err instanceof Error ? err.message : "enqueue failed" }, { status: 500 });
        }

        return Response.json({ queued: true, totalNew });
      },
    },
  },
});
