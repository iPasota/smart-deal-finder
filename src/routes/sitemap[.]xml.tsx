// Dynamic sitemap. Includes homepage + all category pages (top + child).
// Served at /sitemap.xml
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const BASE_URL = "https://whdfinder.lovable.app";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const supabase = createClient<Database>(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_PUBLISHABLE_KEY!,
          { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
        );

        const { data: cats } = await supabase
          .from("categories")
          .select("id, parent_id, slug");

        const rows = cats ?? [];
        const byId = new Map(rows.map((r) => [r.id, r]));

        const urls: Array<{ loc: string; priority: string; changefreq: string }> = [
          { loc: `${BASE_URL}/`, priority: "1.0", changefreq: "hourly" },
        ];

        for (const c of rows) {
          if (c.parent_id === null) {
            urls.push({
              loc: `${BASE_URL}/${c.slug}`,
              priority: "0.8",
              changefreq: "daily",
            });
          } else {
            const parent = byId.get(c.parent_id);
            if (!parent) continue;
            urls.push({
              loc: `${BASE_URL}/${parent.slug}/${c.slug}`,
              priority: "0.7",
              changefreq: "daily",
            });
          }
        }

        const now = new Date().toISOString();
        const xml =
          `<?xml version="1.0" encoding="UTF-8"?>\n` +
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
          urls
            .map(
              (u) =>
                `  <url>\n    <loc>${u.loc}</loc>\n    <lastmod>${now}</lastmod>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`,
            )
            .join("\n") +
          `\n</urlset>\n`;

        return new Response(xml, {
          status: 200,
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
