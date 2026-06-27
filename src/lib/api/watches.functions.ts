import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const createSchema = z.object({
  asin: z.string().min(1).max(32),
  productTitle: z.string().min(1).max(500),
  productImageUrl: z.string().url().nullable().optional(),
  productBrand: z.string().max(200).nullable().optional(),
  targetPriceCents: z.number().int().positive(),
  currentPriceCents: z.number().int().positive().nullable().optional(),
  condition: z.string().max(40).default("used_like_new"),
});

export const listWatches = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("watches")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createWatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("watches")
      .upsert(
        {
          user_id: context.userId,
          asin: data.asin,
          product_title: data.productTitle,
          product_image_url: data.productImageUrl ?? null,
          product_brand: data.productBrand ?? null,
          target_price_cents: data.targetPriceCents,
          current_price_cents: data.currentPriceCents ?? null,
          condition: data.condition,
          active: true,
        },
        { onConflict: "user_id,asin,condition" },
      )
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteWatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("watches").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
