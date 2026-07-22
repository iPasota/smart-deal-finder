import { createFileRoute } from "@tanstack/react-router";

function html(body: string) {
  return new Response(
    `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>whdfinder Preiswecker</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{font-family:system-ui,Arial,sans-serif;margin:0;background:#f9fafb;color:#111827}
.wrap{max-width:520px;margin:64px auto;padding:32px;background:#fff;border-radius:16px;border:1px solid #e5e7eb;text-align:center}
h1{font-size:22px;margin:0 0 12px}p{color:#4b5563;line-height:1.55}
a.btn{display:inline-block;margin-top:16px;padding:10px 18px;background:#059669;color:#fff;border-radius:8px;text-decoration:none;font-weight:600}</style>
</head><body><div class="wrap">${body}</div></body></html>`,
    { status: 200, headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

export const Route = createFileRoute("/api/public/email/confirm")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const token = url.searchParams.get("token");
        if (!token) return html(`<h1>Ungültiger Link</h1><p>Kein Token übermittelt.</p>`);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: watch, error } = await supabaseAdmin
          .from("email_watches")
          .select("id, email, product_title, confirmed_at, unsubscribed_at")
          .eq("doi_token", token)
          .maybeSingle();

        if (error || !watch) return html(`<h1>Ungültiger Link</h1><p>Der Bestätigungs-Link ist unbekannt oder abgelaufen.</p><p><a class="btn" href="https://whdfinder.com">Zur Startseite</a></p>`);
        if (watch.unsubscribed_at) return html(`<h1>Abgemeldet</h1><p>Diese E-Mail-Adresse ist von Preisweckern abgemeldet.</p>`);
        if (watch.confirmed_at) return html(`<h1>Bereits bestätigt ✓</h1><p>Dein Preiswecker für <strong>${escapeHtml(watch.product_title)}</strong> ist aktiv.</p><p><a class="btn" href="https://whdfinder.com">Zur Startseite</a></p>`);

        await supabaseAdmin
          .from("email_watches")
          .update({ confirmed_at: new Date().toISOString() })
          .eq("id", watch.id);

        return html(`<h1>Preiswecker aktiv ✓</h1><p>Wir mailen dich, sobald der Warehouse-Preis für <strong>${escapeHtml(watch.product_title)}</strong> dein Ziel erreicht.</p><p><a class="btn" href="https://whdfinder.com">Zur Startseite</a></p>`);
      },
    },
  },
});

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
