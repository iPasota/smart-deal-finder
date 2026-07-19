import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { listPagesAdmin, updatePage, type PageRow } from "@/lib/pages.functions";
import { sanitizePageHtml } from "@/lib/sanitize";

export const Route = createFileRoute("/_authenticated/admin/pages")({
  ssr: false,
  component: AdminPagesPage,
});

function AdminPagesPage() {
  const list = useServerFn(listPagesAdmin);
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "pages"] as const,
    queryFn: () => list(),
  });
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (!selected && data && data.length) setSelected(data[0].slug);
  }, [data, selected]);

  if (isLoading) return <div className="grid min-h-screen place-items-center"><Loader2 className="size-6 animate-spin" /></div>;
  if (error) {
    const forbidden = /forbidden/i.test(error.message);
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="font-display text-2xl font-extrabold">{forbidden ? "Kein Admin-Zugriff" : "Fehler"}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{forbidden ? "Nur für Administratoren." : error.message}</p>
      </div>
    );
  }

  const current = data?.find((p) => p.slug === selected) ?? null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-hairline">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 lg:px-6">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Admin</div>
            <h1 className="font-display text-2xl font-extrabold">Rechtsseiten</h1>
          </div>
          <Link to="/" className="text-sm font-semibold text-muted-foreground hover:text-foreground">← zurück</Link>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[220px_1fr] lg:px-6">
        <nav className="rounded-2xl border border-hairline bg-surface p-3">
          <ul className="space-y-0.5">
            {(data ?? []).map((p) => (
              <li key={p.slug}>
                <button
                  type="button"
                  onClick={() => setSelected(p.slug)}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm font-medium ${
                    selected === p.slug ? "bg-foreground text-background" : "hover:bg-foreground/5"
                  }`}
                >
                  {p.title}
                  <div className="text-[10px] font-normal opacity-70">/{p.slug}</div>
                </button>
              </li>
            ))}
          </ul>
        </nav>
        {current && <EditForm key={current.slug} row={current} />}
      </div>
    </div>
  );
}

function EditForm({ row }: { row: PageRow }) {
  const qc = useQueryClient();
  const update = useServerFn(updatePage);
  const [form, setForm] = useState({ title: row.title, body_html: row.body_html });

  const save = useMutation({
    mutationFn: () => update({ data: { slug: row.slug, title: form.title, body_html: form.body_html } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "pages"] }),
  });

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); save.mutate(); }}
      className="rounded-2xl border border-hairline bg-surface p-5"
    >
      <div className="mb-4">
        <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">/{row.slug}</div>
        <a href={`/${row.slug}`} target="_blank" rel="noreferrer" className="text-xs text-muted-foreground hover:text-foreground">
          Vorschau öffnen ↗
        </a>
      </div>
      <label className="grid gap-1.5">
        <span className="text-xs font-semibold text-foreground/80">Titel</span>
        <input
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="h-10 rounded-lg border-2 border-foreground/15 bg-white px-3 text-sm focus:border-emerald focus:outline-none"
        />
      </label>
      <label className="mt-4 grid gap-1.5">
        <span className="flex items-center justify-between text-xs font-semibold text-foreground/80">
          <span>Inhalt (HTML erlaubt)</span>
          <span className="text-muted-foreground">&lt;h2&gt;, &lt;p&gt;, &lt;ul&gt;, &lt;a href&gt;, &lt;table&gt; …</span>
        </span>
        <textarea
          rows={22}
          value={form.body_html}
          onChange={(e) => setForm({ ...form, body_html: e.target.value })}
          className="rounded-lg border-2 border-foreground/15 bg-white p-3 font-mono text-xs focus:border-emerald focus:outline-none"
        />
      </label>

      <div className="mt-4">
        <div className="mb-1 text-xs font-semibold text-muted-foreground">Vorschau</div>
        <div
          className="prose prose-neutral max-w-none rounded-lg border border-hairline bg-white p-4 text-sm"
          dangerouslySetInnerHTML={{ __html: sanitizePageHtml(form.body_html) }}
        />
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button
          type="submit"
          disabled={save.isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-bold text-background disabled:opacity-60"
        >
          {save.isPending && <Loader2 className="size-4 animate-spin" />}
          Speichern
        </button>
        {save.isSuccess && !save.isPending && <span className="text-xs text-emerald">Gespeichert ✓</span>}
        {save.error && <span className="text-xs text-red-700">{(save.error as Error).message}</span>}
      </div>
    </form>
  );
}
