import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Loader2, Trash2, ShieldCheck, Search } from "lucide-react";
import { listAppUsers, deleteAppUser, type AdminUserRow } from "@/lib/api/admin-users.functions";

export const Route = createFileRoute("/_authenticated/admin/users")({
  ssr: false,
  component: AdminUsersPage,
});

function AdminUsersPage() {
  const listFn = useServerFn(listAppUsers);
  const delFn = useServerFn(deleteAppUser);
  const qc = useQueryClient();
  const [q, setQ] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "users"] as const,
    queryFn: () => listFn(),
  });

  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "users"] }),
    onError: (e) => alert(e instanceof Error ? e.message : "Fehler beim Löschen"),
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

  const rows = (data ?? []) as AdminUserRow[];
  const needle = q.trim().toLowerCase();
  const filtered = needle
    ? rows.filter((r) =>
        r.email.toLowerCase().includes(needle) ||
        (r.display_name ?? "").toLowerCase().includes(needle) ||
        r.id.includes(needle),
      )
    : rows;
  const total = rows.length;
  const admins = rows.filter((r) => r.is_admin).length;
  const confirmed = rows.filter((r) => r.email_confirmed_at).length;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-hairline">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 lg:px-6">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Admin</div>
            <h1 className="font-display text-2xl font-extrabold">Benutzer</h1>
          </div>
          <Link to="/" className="text-sm font-semibold text-muted-foreground hover:text-foreground">← zurück</Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 lg:px-6">
        <div className="mb-4 grid grid-cols-3 gap-3">
          <Stat label="Gesamt" value={total} tone="muted" />
          <Stat label="E-Mail bestätigt" value={confirmed} tone="emerald" />
          <Stat label="Admins" value={admins} tone="amber" />
        </div>

        <div className="mb-3 relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="E-Mail, Name oder ID suchen…"
            className="w-full rounded-xl border border-hairline bg-surface py-2 pl-9 pr-3 text-sm outline-none focus:border-foreground/30"
          />
        </div>

        <div className="overflow-hidden rounded-2xl border border-hairline bg-surface">
          <table className="w-full text-sm">
            <thead className="bg-foreground/5 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2">E-Mail</th>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Provider</th>
                <th className="px-3 py-2 text-right">Wecker</th>
                <th className="px-3 py-2">Registriert</th>
                <th className="px-3 py-2">Letzter Login</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">Keine Benutzer.</td></tr>
              )}
              {filtered.map((r) => (
                <tr key={r.id} className="border-t border-hairline">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs">{r.email}</span>
                      {r.is_admin && (
                        <span title="Admin" className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                          <ShieldCheck className="size-3" /> Admin
                        </span>
                      )}
                      {!r.email_confirmed_at && (
                        <span className="rounded-full bg-foreground/10 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">unbestätigt</span>
                      )}
                    </div>
                    <div className="text-[10px] text-muted-foreground">{r.id}</div>
                  </td>
                  <td className="px-3 py-2">{r.display_name ?? "—"}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{r.provider ?? "email"}</td>
                  <td className="px-3 py-2 text-right font-mono">{r.watch_count}</td>
                  <td className="px-3 py-2 text-[11px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString("de-DE")}</td>
                  <td className="px-3 py-2 text-[11px] text-muted-foreground">
                    {r.last_sign_in_at ? new Date(r.last_sign_in_at).toLocaleDateString("de-DE") : "—"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      title="Endgültig löschen (DSGVO)"
                      disabled={del.isPending}
                      onClick={() => {
                        if (confirm(`Benutzer ${r.email} und alle zugehörigen Daten (Preiswecker, Profil, Rollen) endgültig löschen? Diese Aktion kann nicht rückgängig gemacht werden.`)) {
                          del.mutate(r.id);
                        }
                      }}
                      className="inline-flex size-8 items-center justify-center rounded-md border border-hairline text-red-700 hover:bg-red-50 disabled:opacity-50"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          Beim Löschen werden Auth-Account, Profil, Rollen und alle Preiswecker des Benutzers entfernt (DSGVO Art. 17 – Recht auf Vergessenwerden).
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
