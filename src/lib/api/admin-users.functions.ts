import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function requireAdmin(ctx: { supabase: any; userId: string }) {
  const r = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!r.data) throw new Error("Forbidden");
}

export type AdminUserRow = {
  id: string;
  email: string;
  display_name: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  provider: string | null;
  is_admin: boolean;
  watch_count: number;
};

export const listAppUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminUserRow[]> => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const users: any[] = [];
    let page = 1;
    // Paginate up to 5000 users (50 * 100)
    for (let i = 0; i < 50; i++) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 100 });
      if (error) throw new Error(error.message);
      users.push(...(data?.users ?? []));
      if (!data?.users?.length || data.users.length < 100) break;
      page++;
    }

    const ids = users.map((u) => u.id);
    const [{ data: profiles }, { data: roles }, { data: watches }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, display_name").in("id", ids),
      supabaseAdmin.from("user_roles").select("user_id, role").in("user_id", ids).eq("role", "admin"),
      supabaseAdmin.from("watches").select("user_id").in("user_id", ids),
    ]);

    const nameById = new Map<string, string>();
    for (const p of profiles ?? []) if (p.display_name) nameById.set(p.id, p.display_name);
    const adminIds = new Set<string>((roles ?? []).map((r: any) => r.user_id));
    const watchCounts = new Map<string, number>();
    for (const w of watches ?? []) watchCounts.set(w.user_id, (watchCounts.get(w.user_id) ?? 0) + 1);

    return users
      .map((u: any) => ({
        id: u.id,
        email: u.email ?? "",
        display_name: nameById.get(u.id) ?? null,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at ?? null,
        email_confirmed_at: u.email_confirmed_at ?? null,
        provider: u.app_metadata?.provider ?? null,
        is_admin: adminIds.has(u.id),
        watch_count: watchCounts.get(u.id) ?? 0,
      }))
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  });

export const deleteAppUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    if (data.id === context.userId) throw new Error("Du kannst dich nicht selbst löschen");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Delete owned data first (profiles/user_roles/watches have FK cascade in most setups,
    // but do it explicitly for GDPR clarity and to catch tables without cascade).
    await supabaseAdmin.from("watches").delete().eq("user_id", data.id);
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.id);
    await supabaseAdmin.from("profiles").delete().eq("id", data.id);

    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
