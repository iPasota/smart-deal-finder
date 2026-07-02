// Admin server fns for maintaining categories (SEO fields, name overrides).
// Guarded by requireSupabaseAuth + explicit has_role('admin') check.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import type { CategoryRow } from "@/lib/categories";

async function ensureAdmin(ctx: {
  supabase: ReturnType<typeof requireSupabaseAuth extends { client: infer C } ? never : any>;
  userId: string;
}) {
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

export const listCategoriesAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CategoryRow[]> => {
    await ensureAdmin(context);
    const { data, error } = await context.supabase
      .from("categories")
      .select("id, parent_id, slug, name, keepa_category_id, seo_title, seo_description, intro_md, outro_md, sort")
      .order("sort")
      .order("name");
    if (error) throw new Error(error.message);
    return (data ?? []) as CategoryRow[];
  });

const UpdateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(120).optional(),
  seo_title: z.string().max(200).nullable().optional(),
  seo_description: z.string().max(400).nullable().optional(),
  intro_md: z.string().max(20000).nullable().optional(),
  outro_md: z.string().max(20000).nullable().optional(),
  sort: z.number().int().min(0).max(9999).optional(),
});

export const updateCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => UpdateSchema.parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { id, ...patch } = data;
    const { error } = await context.supabase
      .from("categories")
      .update(patch)
      .eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const GenSchema = z.object({ id: z.string().uuid() });

export const generateCategorySeo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => GenSchema.parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    // Load the category + its parent name for context
    const { data: row, error } = await context.supabase
      .from("categories")
      .select("id, name, parent_id")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Category not found");

    let parentName: string | null = null;
    if (row.parent_id) {
      const { data: p } = await context.supabase
        .from("categories")
        .select("name")
        .eq("id", row.parent_id)
        .maybeSingle();
      parentName = p?.name ?? null;
    }

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    const contextLine = parentName
      ? `Unterkategorie "${row.name}" innerhalb von "${parentName}"`
      : `Hauptkategorie "${row.name}"`;

    const prompt = `Du schreibst SEO-Texte für whdfinder.de — eine Preisvergleichsseite für Amazon Warehouse Deals (B-Ware, Retouren, geprüfte Rückläufer) in Deutschland.

Erstelle für die ${contextLine} folgende Felder als JSON:

{
  "seo_title": "60-65 Zeichen, enthält '${row.name}' und 'Amazon Warehouse' oder 'B-Ware'",
  "seo_description": "150-160 Zeichen Meta-Description, Nutzenversprechen + CTA",
  "intro_md": "2-3 Absätze Markdown, konkret zur Kategorie ${row.name}, welche Produkte man findet, worauf beim Kauf zu achten ist. Kein Marketing-Blabla.",
  "outro_md": "1-2 Absätze Markdown mit FAQ-Charakter, z.B. Rückgabe, Garantie, Zustand"
}

Nur das reine JSON zurückgeben, ohne Codeblock, ohne erklärenden Text.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Du bist ein deutschsprachiger SEO-Redakteur." },
          { role: "user", content: prompt },
        ],
      }),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`AI gateway ${res.status}: ${t.slice(0, 200)}`);
    }
    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = json.choices?.[0]?.message?.content ?? "";
    // Strip accidental code fences
    const cleaned = content.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
    let parsed: {
      seo_title?: string;
      seo_description?: string;
      intro_md?: string;
      outro_md?: string;
    };
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      throw new Error("AI returned invalid JSON");
    }
    return parsed;
  });
