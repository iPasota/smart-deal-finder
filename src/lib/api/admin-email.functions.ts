import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function requireAdmin(ctx: { supabase: any; userId: string }) {
  const r = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!r.data) throw new Error("Forbidden");
}

// ============ Subscribers ============

export type SubscriberRow = {
  id: string;
  email: string;
  product_title: string;
  product_brand: string | null;
  asin: string;
  target_price_cents: number;
  condition: string;
  confirmed_at: string | null;
  unsubscribed_at: string | null;
  last_triggered_at: string | null;
  created_at: string;
};

export const listSubscribers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SubscriberRow[]> => {
    await requireAdmin(context);
    const { data, error } = await context.supabase
      .from("email_watches")
      .select("id, email, product_title, product_brand, asin, target_price_cents, condition, confirmed_at, unsubscribed_at, last_triggered_at, created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return (data ?? []) as SubscriberRow[];
  });

export const deleteSubscriber = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { error } = await context.supabase.from("email_watches").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const unsubscribeSubscriber = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { error } = await context.supabase
      .from("email_watches")
      .update({ unsubscribed_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ Email Templates ============

export type EmailTemplateRow = {
  name: string;
  display_name: string;
  subject: string;
  html_body: string;
  description: string | null;
  updated_at: string;
};

export const listEmailTemplates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<EmailTemplateRow[]> => {
    await requireAdmin(context);
    const { data, error } = await context.supabase
      .from("email_templates")
      .select("name, display_name, subject, html_body, description, updated_at")
      .order("name");
    if (error) throw new Error(error.message);
    return (data ?? []) as EmailTemplateRow[];
  });

export const updateEmailTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      name: z.string().min(1),
      subject: z.string().min(1).max(500),
      html_body: z.string().min(1).max(50_000),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { error } = await context.supabase
      .from("email_templates")
      .update({ subject: data.subject, html_body: data.html_body })
      .eq("name", data.name);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const triggerAdminDigestNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    const secret = process.env.EMAIL_HOOK_SECRET;
    if (!secret) throw new Error("EMAIL_HOOK_SECRET not configured");
    const res = await fetch("https://whdfinder.com/api/public/hooks/admin-daily-digest", {
      method: "POST",
      headers: { authorization: `Bearer ${secret}`, "content-type": "application/json" },
      body: "{}",
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`Digest failed: ${res.status} ${text}`);
    return { ok: true, response: text };
  });
