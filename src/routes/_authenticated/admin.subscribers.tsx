import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Trash2, MailX } from "lucide-react";
import {
  listSubscribers,
  deleteSubscriber,
  unsubscribeSubscriber,
  type SubscriberRow,
} from "@/lib/api/admin-email.functions";

export const Route = createFileRoute("/_authenticated/admin/subscribers")({
  ssr: false,
  component: AdminSubscribersPage,
});

function formatEUR(cents: number): string {
  return `${(cents / 100).toFixed(2).replace(".", ",")} €`;
}

function AdminSubscribersPage() {
  const listFn = useServerFn(listSubscribers);
  const delFn = useServerFn(deleteSubscriber);
  const unsubFn = useServerFn(unsubscribeSubscriber);
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "subscribers"] as const,
    queryFn: () => listFn(),
  });

  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "subscribers"] }),
  });
  const unsub = useMutation({
    mutationFn: (id: string) => unsubFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "subscribers"] }),
  });

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

  const rows = (data ?? []) as SubscriberRow[];
  const confirmed = rows.filter((r) => r.confirmed_at && !r.unsubscribed_at).length;
  const pending = rows.filter((r) => !r.confirmed_at && !r.unsubscribed_at).length;
  const unsubscribed = rows.filter((r) => r.unsubscribed_at).length;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-hairline">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 lg:px-6">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Admin</div>
            <h1 className="font-display text-2xl font-extrabold">Preiswecker-Abonnenten</h1>
          </div>
          <Link to="/" className="text-sm font-semibold text-muted-foreground hover:text-foreground">← zurück</Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 lg:px-6">
        <div className="mb-4 grid grid-cols-3 gap-3">
          <Stat label="Bestätigt" value={confirmed} tone="emerald" />
          <Stat label="Ausstehend (DOI)" value={pending} tone="amber" />
          <Stat label="Abgemeldet" value={unsubscribed} tone="muted" />
        </div>

        <div className="overflow-hidden rounded-2xl border border-hairline bg-surface">
          <table className="w-full text-sm">
            <thead className="bg-foreground/5 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2">E-Mail</th>
                <th className="px-3 py-2">Produkt</th>
                <th className="px-3 py-2 text-right">Ziel</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Erstellt</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">Noch keine Abonnenten.</td></tr>
              )}
              {rows.map((r) => {
                const status = r.unsubscribed_at
                  ? { text: "Abgemeldet", cls: "bg-foreground/10 text-muted-foreground" }
                  : r.confirmed_at
                  ? { text: "Bestätigt", cls: "bg-emerald-soft text-emerald-ink" }
                  : { text: "DOI ausstehend", cls: "bg-amber-100 text-amber-800" };
                return (
                  <tr key={r.id} className="border-t border-hairline">
                    <td className="px-3 py-2 font-mono text-xs">{r.email}</td>
                    <td className="px-3 py-2">
                      <div className="max-w-[280px] truncate">{r.product_title}</div>
                      <div className="text-[10px] text-muted-foreground">{r.asin} · {r.condition}</div>
                    </td>
                    <td className="px-3 py-2 text-right font-mono">{formatEUR(r.target_price_cents)}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${status.cls}`}>{status.text}</span>
                    </td>
                    <td className="px-3 py-2 text-[11px] text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString("de-DE")}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex justify-end gap-1">
                        {!r.unsubscribed_at && (
                          <button
                            type="button"
                            title="Abmelden"
                            onClick={() => unsub.mutate(r.id)}
                            className="inline-flex size-8 items-center justify-center rounded-md border border-hairline hover:bg-foreground/5"
                          >
                            <MailX className="size-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          title="Löschen"
                          onClick={() => { if (confirm(`Abonnent ${r.email} endgültig löschen?`)) del.mutate(r.id); }}
                          className="inline-flex size-8 items-center justify-center rounded-md border border-hairline text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          Zeigt die letzten 500 Einträge. Nach der DOI-Bestätigung erhält der Abonnent Preisalarme, sobald der Warehouse-Preis das Ziel erreicht (Cooldown 24h).
        </p>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: "emerald" | "amber" | "muted" }) {
  const cls =
    tone === "emerald" ? "bg-emerald-soft text-emerald-ink"
    : tone === "amber" ? "bg-amber-100 text-amber-800"
    : "bg-foreground/5 text-muted-foreground";
  return (
    <div className={`rounded-xl px-4 py-3 ${cls}`}>
      <div className="text-[10px] font-bold uppercase tracking-widest opacity-70">{label}</div>
      <div className="font-display text-2xl font-extrabold">{value}</div>
    </div>
  );
}
