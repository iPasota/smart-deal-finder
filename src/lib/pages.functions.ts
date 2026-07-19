import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type PageRow = { slug: string; title: string; body_html: string; updated_at: string };

function anonClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

export const getPage = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ slug: z.string().min(1) }).parse(d))
  .handler(async ({ data }): Promise<PageRow | null> => {
    const supabase = anonClient();
    const { data: row, error } = await supabase
      .from("pages")
      .select("slug, title, body_html, updated_at")
      .eq("slug", data.slug)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (row as PageRow | null) ?? null;
  });

export const listPagesAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PageRow[]> => {
    const isAdmin = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin.data) throw new Error("Forbidden");
    const { data, error } = await context.supabase
      .from("pages")
      .select("slug, title, body_html, updated_at")
      .order("slug");
    if (error) throw new Error(error.message);
    return (data ?? []) as PageRow[];
  });

export const updatePage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      slug: z.string().min(1),
      title: z.string().min(1),
      body_html: z.string().default(""),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const isAdmin = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin.data) throw new Error("Forbidden");
    const { error } = await context.supabase
      .from("pages")
      .upsert({ slug: data.slug, title: data.title, body_html: data.body_html });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
