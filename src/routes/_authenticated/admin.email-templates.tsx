import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Loader2, Send } from "lucide-react";
import {
  listEmailTemplates,
  updateEmailTemplate,
  triggerAdminDigestNow,
  type EmailTemplateRow,
} from "@/lib/api/admin-email.functions";
import { sanitizePageHtml } from "@/lib/sanitize";

export const Route = createFileRoute("/_authenticated/admin/email-templates")({
  ssr: false,
  component: AdminEmailTemplatesPage,
});

function AdminEmailTemplatesPage() {
  const listFn = useServerFn(listEmailTemplates);
  const digestFn = useServerFn(triggerAdminDigestNow);
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "email-templates"] as const,
    queryFn: () => listFn(),
  });

  const runDigest = useMutation({ mutationFn: () => digestFn() });
  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => { if (!selected && data && data.length) setSelected(data[0].name); }, [data, selected]);

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

  const rows = (data ?? []) as EmailTemplateRow[];
  const current = rows.find((r) => r.name === selected) ?? null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-hairline">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 lg:px-6">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Admin</div>
            <h1 className="font-display text-2xl font-extrabold">E-Mail-Vorlagen</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => runDigest.mutate()}
              disabled={runDigest.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg border border-hairline bg-white px-3 py-1.5 text-xs font-semibold hover:bg-foreground/5 disabled:opacity-60"
              title="Tages-Report jetzt an mail.martink@gmail.com senden"
            >
              {runDigest.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />} Digest jetzt senden
            </button>
            <Link to="/" className="text-sm font-semibold text-muted-foreground hover:text-foreground">← zurück</Link>
          </div>
        </div>
        {runDigest.isSuccess && <div className="border-t border-hairline bg-emerald-soft px-4 py-1.5 text-center text-xs text-emerald-ink">Digest wurde in die Sende-Warteschlange gestellt.</div>}
        {runDigest.error && <div className="border-t border-hairline bg-red-50 px-4 py-1.5 text-center text-xs text-red-700">{(runDigest.error as Error).message}</div>}
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[240px_1fr] lg:px-6">
        <nav className="rounded-2xl border border-hairline bg-surface p-3">
          <ul className="space-y-0.5">
            {rows.map((t) => (
              <li key={t.name}>
                <button
                  type="button"
                  onClick={() => setSelected(t.name)}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm font-medium ${selected === t.name ? "bg-foreground text-background" : "hover:bg-foreground/5"}`}
                >
                  {t.display_name}
                  <div className="text-[10px] font-normal opacity-70">{t.name}</div>
                </button>
              </li>
            ))}
          </ul>
        </nav>
        {current && <TemplateEditor key={current.name} row={current} onSaved={() => qc.invalidateQueries({ queryKey: ["admin", "email-templates"] })} />}
      </div>
    </div>
  );
}

function TemplateEditor({ row, onSaved }: { row: EmailTemplateRow; onSaved: () => void }) {
  const updateFn = useServerFn(updateEmailTemplate);
  const [subject, setSubject] = useState(row.subject);
  const [html, setHtml] = useState(row.html_body);
  const save = useMutation({
    mutationFn: () => updateFn({ data: { name: row.name, subject, html_body: html } }),
    onSuccess: onSaved,
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="rounded-2xl border border-hairline bg-surface p-5">
      <div className="mb-4">
        <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{row.name}</div>
        <h2 className="font-display text-xl font-extrabold">{row.display_name}</h2>
        {row.description && <p className="mt-1 text-xs text-muted-foreground">{row.description}</p>}
      </div>

      <label className="grid gap-1.5">
        <span className="text-xs font-semibold text-foreground/80">Betreff</span>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="h-10 rounded-lg border-2 border-foreground/15 bg-white px-3 text-sm focus:border-emerald focus:outline-none"
        />
      </label>

      <label className="mt-4 grid gap-1.5">
        <span className="flex items-center justify-between text-xs font-semibold text-foreground/80">
          <span>HTML-Body</span>
          <span className="text-muted-foreground">Platzhalter mit &#123;&#123;variable&#125;&#125;</span>
        </span>
        <textarea
          rows={20}
          value={html}
          onChange={(e) => setHtml(e.target.value)}
          className="rounded-lg border-2 border-foreground/15 bg-white p-3 font-mono text-xs focus:border-emerald focus:outline-none"
        />
      </label>

      <div className="mt-4">
        <div className="mb-1 text-xs font-semibold text-muted-foreground">Vorschau (Platzhalter unersetzt)</div>
        <div className="rounded-lg border border-hairline bg-white p-4 text-sm" dangerouslySetInnerHTML={{ __html: sanitizePageHtml(html) }} />
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button type="submit" disabled={save.isPending} className="inline-flex items-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-bold text-background disabled:opacity-60">
          {save.isPending && <Loader2 className="size-4 animate-spin" />}
          Speichern
        </button>
        {save.isSuccess && !save.isPending && <span className="text-xs text-emerald">Gespeichert ✓</span>}
        {save.error && <span className="text-xs text-red-700">{(save.error as Error).message}</span>}
      </div>
    </form>
  );
}
