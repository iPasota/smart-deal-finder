import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";

import {
  listCategoriesAdmin,
  updateCategory,
  generateCategorySeo,
} from "@/lib/categories-admin.functions";
import { buildTree, type CategoryRow } from "@/lib/categories";

export const Route = createFileRoute("/_authenticated/admin/categories")({
  ssr: false,
  component: AdminCategoriesPage,
});

function AdminCategoriesPage() {
  const list = useServerFn(listCategoriesAdmin);
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "categories"] as const,
    queryFn: () => list(),
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const tree = useMemo(() => (data ? buildTree(data) : []), [data]);
  const selected = data?.find((c) => c.id === selectedId) ?? null;

  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }
  if (error) {
    const isForbidden = /forbidden/i.test(error.message);
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="font-display text-2xl font-extrabold">
          {isForbidden ? "Kein Admin-Zugriff" : "Fehler"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {isForbidden
            ? "Dieser Bereich ist Administratoren vorbehalten."
            : error.message}
        </p>
        <Link to="/" className="mt-6 inline-block rounded-xl bg-foreground px-4 py-2 text-sm font-bold text-background">
          Zur Startseite
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-hairline">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 lg:px-6">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Admin</div>
            <h1 className="font-display text-2xl font-extrabold">Kategorien &amp; SEO</h1>
          </div>
          <Link to="/" className="text-sm font-semibold text-muted-foreground hover:text-foreground">← zurück</Link>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[280px_1fr] lg:px-6">
        <nav className="rounded-2xl border border-hairline bg-surface p-3">
          <div className="mb-2 px-2 text-xs font-semibold text-muted-foreground">
            {data?.length ?? 0} Kategorien
          </div>
          <ul className="space-y-0.5">
            {tree.map((top) => (
              <li key={top.id}>
                <CategoryItem row={top} depth={0} selectedId={selectedId} onSelect={setSelectedId} />
                {top.children.length > 0 && (
                  <ul className="ml-3 border-l border-hairline pl-1">
                    {top.children.map((c) => (
                      <li key={c.id}>
                        <CategoryItem row={c} depth={1} selectedId={selectedId} onSelect={setSelectedId} />
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </nav>

        <section>
          {selected ? (
            <EditForm key={selected.id} row={selected} allRows={data ?? []} />
          ) : (
            <div className="grid place-items-center rounded-2xl border border-dashed border-hairline p-16 text-center text-sm text-muted-foreground">
              Kategorie links wählen, um SEO-Texte zu pflegen.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function CategoryItem({
  row,
  depth,
  selectedId,
  onSelect,
}: {
  row: CategoryRow;
  depth: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const active = selectedId === row.id;
  const hasSeo = !!(row.seo_title || row.seo_description || row.intro_md);
  return (
    <button
      type="button"
      onClick={() => onSelect(row.id)}
      className={`flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-sm font-medium transition-colors ${
        active ? "bg-foreground text-background" : "text-foreground/80 hover:bg-foreground/5"
      }`}
    >
      <span className={depth === 0 ? "font-semibold" : ""}>{row.name}</span>
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          hasSeo ? "bg-emerald" : "bg-foreground/20"
        }`}
        title={hasSeo ? "SEO gepflegt" : "Kein SEO-Text"}
      />
    </button>
  );
}

function EditForm({ row, allRows }: { row: CategoryRow; allRows: CategoryRow[] }) {
  const qc = useQueryClient();
  const update = useServerFn(updateCategory);
  const generate = useServerFn(generateCategorySeo);

  const [form, setForm] = useState({
    name: row.name,
    seo_title: row.seo_title ?? "",
    seo_description: row.seo_description ?? "",
    intro_md: row.intro_md ?? "",
    outro_md: row.outro_md ?? "",
  });

  const parent = row.parent_id ? allRows.find((r) => r.id === row.parent_id) : null;
  const path = parent
    ? `/kategorie/${parent.slug}/${row.slug}`
    : `/kategorie/${row.slug}`;

  const saveMut = useMutation({
    mutationFn: () =>
      update({
        data: {
          id: row.id,
          name: form.name,
          seo_title: form.seo_title || null,
          seo_description: form.seo_description || null,
          intro_md: form.intro_md || null,
          outro_md: form.outro_md || null,
        },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "categories"] }),
  });

  const genMut = useMutation({
    mutationFn: () => generate({ data: { id: row.id } }),
    onSuccess: (r) => {
      setForm((f) => ({
        ...f,
        seo_title: r.seo_title ?? f.seo_title,
        seo_description: r.seo_description ?? f.seo_description,
        intro_md: r.intro_md ?? f.intro_md,
        outro_md: r.outro_md ?? f.outro_md,
      }));
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        saveMut.mutate();
      }}
      className="rounded-2xl border border-hairline bg-surface p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {parent ? `${parent.name} ›` : "Hauptkategorie"}
          </div>
          <h2 className="font-display text-xl font-extrabold">{row.name}</h2>
          <a href={path} className="text-xs text-muted-foreground hover:text-foreground" target="_blank" rel="noreferrer">
            {path}
          </a>
        </div>
        <button
          type="button"
          onClick={() => genMut.mutate()}
          disabled={genMut.isPending}
          className="inline-flex items-center gap-1.5 rounded-lg border-2 border-foreground bg-white px-3 py-1.5 text-xs font-bold text-foreground shadow-sm transition-colors hover:bg-foreground hover:text-background disabled:opacity-60"
        >
          {genMut.isPending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          SEO mit KI generieren
        </button>
      </div>

      {genMut.error && (
        <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{(genMut.error as Error).message}</div>
      )}

      <div className="mt-5 grid gap-4">
        <Field label="Anzeigename">
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="h-10 rounded-lg border-2 border-foreground/15 bg-white px-3 text-sm focus:border-emerald focus:outline-none"
          />
        </Field>
        <Field label="SEO-Titel" hint={`${form.seo_title.length} Zeichen (Ziel 60-65)`}>
          <input
            value={form.seo_title}
            onChange={(e) => setForm({ ...form, seo_title: e.target.value })}
            className="h-10 rounded-lg border-2 border-foreground/15 bg-white px-3 text-sm focus:border-emerald focus:outline-none"
          />
        </Field>
        <Field label="Meta-Description" hint={`${form.seo_description.length} Zeichen (Ziel 150-160)`}>
          <textarea
            rows={3}
            value={form.seo_description}
            onChange={(e) => setForm({ ...form, seo_description: e.target.value })}
            className="rounded-lg border-2 border-foreground/15 bg-white p-3 text-sm focus:border-emerald focus:outline-none"
          />
        </Field>
        <Field label="Intro (Markdown oder HTML, oberhalb der Deals)" hint="Erlaubt: <h2>, <p>, <ul>, <a href>, <img>, <table>, **fett** …">
          <textarea
            rows={10}
            value={form.intro_md}
            onChange={(e) => setForm({ ...form, intro_md: e.target.value })}
            className="rounded-lg border-2 border-foreground/15 bg-white p-3 font-mono text-xs focus:border-emerald focus:outline-none"
          />
        </Field>
        <Field label="Outro (Markdown oder HTML, unterhalb der Deals)" hint="HTML-Tags werden gerendert; <script>/<iframe> werden entfernt.">
          <textarea
            rows={8}
            value={form.outro_md}
            onChange={(e) => setForm({ ...form, outro_md: e.target.value })}
            className="rounded-lg border-2 border-foreground/15 bg-white p-3 font-mono text-xs focus:border-emerald focus:outline-none"
          />
        </Field>

      </div>

      <div className="mt-5 flex items-center gap-3">
        <button
          type="submit"
          disabled={saveMut.isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-bold text-background disabled:opacity-60"
        >
          {saveMut.isPending && <Loader2 className="size-4 animate-spin" />}
          Speichern
        </button>
        {saveMut.isSuccess && !saveMut.isPending && (
          <span className="text-xs text-emerald">Gespeichert ✓</span>
        )}
        {saveMut.error && (
          <span className="text-xs text-red-700">{(saveMut.error as Error).message}</span>
        )}
      </div>
    </form>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5">
      <span className="flex items-center justify-between text-xs font-semibold text-foreground/80">
        <span>{label}</span>
        {hint && <span className="text-muted-foreground">{hint}</span>}
      </span>
      {children}
    </label>
  );
}
