import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bell, ExternalLink, Trash2, ArrowLeft } from "lucide-react";
import { listWatches, deleteWatch } from "@/lib/api/watches.functions";
import { buildDeeplink } from "@/lib/affiliate";
import { formatEUR } from "@/lib/mock-deals";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/watchlist")({
  component: WatchlistPage,
});

function WatchlistPage() {
  const list = useServerFn(listWatches);
  const del = useServerFn(deleteWatch);
  const qc = useQueryClient();

  const { data: watches = [], isLoading } = useQuery({
    queryKey: ["watches"],
    queryFn: () => list(),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["watches"] }),
  });

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-hairline bg-background/85 backdrop-blur-lg">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> Zurück zu Deals
          </Link>
          <button
            onClick={signOut}
            className="rounded-lg border border-hairline px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:border-destructive hover:text-destructive"
          >
            Abmelden
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10">
        <div className="mb-8 flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl border border-emerald/20 bg-emerald-soft text-emerald-ink">
            <Bell className="size-5" strokeWidth={2.5} />
          </span>
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">Deine Preiswecker</h1>
            <p className="text-sm text-muted-foreground">
              Wir mailen dich, sobald ein Warehouse-Preis dein Ziel erreicht.
            </p>
          </div>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Lade…</p>
        ) : watches.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-hairline bg-surface-2 p-10 text-center">
            <p className="text-foreground">Noch keine Preiswecker.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Stelle einen Wecker direkt aus der Deal-Liste.
            </p>
            <Link
              to="/"
              className="mt-4 inline-flex items-center justify-center rounded-lg bg-emerald px-4 py-2 text-sm font-semibold text-emerald-foreground"
            >
              Deals ansehen
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {watches.map((w) => (
              <li
                key={w.id}
                className="flex items-center gap-4 rounded-xl border border-hairline bg-surface-2 p-4"
              >
                {w.product_image_url && (
                  <img
                    src={w.product_image_url}
                    alt=""
                    className="size-16 shrink-0 rounded bg-white object-contain"
                  />
                )}
                <div className="min-w-0 flex-1">
                  {w.product_brand && (
                    <div className="truncate text-xs text-muted-foreground">{w.product_brand}</div>
                  )}
                  <div className="truncate text-sm text-foreground">{w.product_title}</div>
                  <div className="mt-1 flex items-center gap-3 text-xs">
                    <span className="text-muted-foreground">Ziel:</span>
                    <span className="font-mono-tabular font-semibold text-emerald">
                      {formatEUR(w.target_price_cents)}
                    </span>
                    {w.current_price_cents != null && (
                      <>
                        <span className="text-muted-foreground">Aktuell:</span>
                        <span className="font-mono-tabular">{formatEUR(w.current_price_cents)}</span>
                      </>
                    )}
                  </div>
                </div>
                <a
                  href={buildDeeplink(w.asin)}
                  target="_blank"
                  rel="noopener sponsored"
                  className="inline-flex items-center gap-1 rounded-lg border border-hairline px-3 py-1.5 text-xs font-semibold hover:border-emerald hover:text-emerald-ink"
                >
                  Amazon <ExternalLink className="size-3" />
                </a>
                <button
                  onClick={() => deleteMut.mutate(w.id)}
                  disabled={deleteMut.isPending}
                  className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                  aria-label="Löschen"
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
