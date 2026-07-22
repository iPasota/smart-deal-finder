import { useState } from "react";
import { Bell, Check, ExternalLink, BookmarkCheck } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { buildDeeplink } from "@/lib/affiliate";
import { formatEUR, type Deal } from "@/lib/mock-deals";
import { GoogleIcon, AppleIcon } from "./BrandIcons";
import { useAuth } from "@/hooks/use-auth";
import { lovable } from "@/integrations/lovable/index";
import { createWatch } from "@/lib/api/watches.functions";

export function PriceAlertModal({
  deal,
  open,
  onOpenChange,
}: {
  deal: Deal;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { user } = useAuth();
  const createWatchFn = useServerFn(createWatch);
  const qc = useQueryClient();

  const [email, setEmail] = useState("");
  const [target, setTarget] = useState(Math.round(deal.priceCents * 0.9) / 100);
  const [sent, setSent] = useState(false);
  const [savedAuth, setSavedAuth] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const reset = () => {
    setSent(false);
    setSavedAuth(false);
    setErr(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setSubmitting(true);
    try {
      if (user) {
        await createWatchFn({
          data: {
            asin: deal.asin,
            productTitle: deal.title,
            productImageUrl: deal.imageUrl,
            productBrand: deal.brand,
            targetPriceCents: Math.round(target * 100),
            currentPriceCents: deal.priceCents,
            condition: deal.condition,
          },
        });
        qc.invalidateQueries({ queryKey: ["watches"] });
        setSavedAuth(true);
      } else {
        const res = await fetch("/api/public/email/watch-subscribe", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            email,
            asin: deal.asin,
            productTitle: deal.title,
            productImageUrl: deal.imageUrl,
            productBrand: deal.brand,
            targetPriceCents: Math.round(target * 100),
            currentPriceCents: deal.priceCents,
            condition: deal.condition,
          }),
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(j.error ?? "Konnte Preiswecker nicht speichern");
        setSent(true);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Konnte Wecker nicht speichern");
    } finally {
      setSubmitting(false);
    }
  };

  const signIn = async (provider: "google" | "apple") => {
    await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: window.location.origin + "/auth",
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-md border-hairline bg-surface-2">
        <DialogHeader>
          <div className="mb-2 flex size-10 items-center justify-center rounded-full bg-emerald-soft text-emerald">
            <Bell className="size-5" />
          </div>
          <DialogTitle className="font-display text-2xl leading-tight">Preiswecker</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Wir mailen dich, sobald der Warehouse-Preis fällt.
          </DialogDescription>
        </DialogHeader>

        {savedAuth ? (
          <div className="mt-2 flex flex-col items-center gap-3 rounded-lg border border-hairline bg-white py-6 text-center">
            <div className="grid size-12 place-items-center rounded-full bg-emerald-soft text-emerald">
              <BookmarkCheck className="size-6" />
            </div>
            <p className="text-sm text-foreground">
              Wecker aktiv — Ziel{" "}
              <span className="font-mono-tabular font-semibold text-emerald">{formatEUR(Math.round(target * 100))}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              Verwalte alle Wecker in deiner Watchlist.
            </p>
          </div>
        ) : sent ? (
          <div className="mt-2 flex flex-col items-center gap-3 rounded-lg border border-hairline bg-white py-6 text-center">
            <div className="grid size-12 place-items-center rounded-full bg-emerald-soft text-emerald">
              <Check className="size-6" />
            </div>
            <p className="text-sm text-foreground">
              Fast geschafft — wir haben dir eine Bestätigungs-Mail an <span className="text-emerald">{email}</span> geschickt.
            </p>
            <p className="text-xs text-muted-foreground">
              Klicke den Link darin, um den Preiswecker zu aktivieren.
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-2 space-y-4">
            <div className="rounded-lg border border-hairline bg-white p-3">
              <div className="flex items-center gap-3">
                <img src={deal.imageUrl} alt="" className="size-12 rounded bg-white object-contain" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs text-muted-foreground">{deal.brand}</div>
                  <div className="truncate text-sm">{deal.title}</div>
                </div>
                <div className="font-mono-tabular text-sm font-semibold text-emerald">
                  {formatEUR(deal.priceCents)}
                </div>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-[11px] uppercase tracking-wider text-muted-foreground">
                Ziel-Preis
              </label>
              <div className="relative">
                <span className="font-mono-tabular pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={target}
                  onChange={(e) => setTarget(parseFloat(e.target.value))}
                  className="font-mono-tabular border-hairline bg-white pl-7 text-base"
                  required
                />
              </div>
            </div>

            {!user && (
              <div>
                <label className="mb-1.5 block text-[11px] uppercase tracking-wider text-muted-foreground">
                  E-Mail
                </label>
                <Input
                  type="email"
                  placeholder="du@beispiel.de"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="border-hairline bg-white"
                  required
                />
              </div>
            )}

            {user && (
              <p className="rounded-lg bg-emerald-soft px-3 py-2 text-xs text-emerald-ink">
                Eingeloggt als {user.email} — Wecker landet in deiner Watchlist.
              </p>
            )}

            {err && (
              <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {err}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald px-4 py-2.5 text-sm font-semibold text-emerald-foreground transition-transform hover:scale-[1.01] disabled:opacity-60"
            >
              {submitting ? "Speichere…" : "Wecker stellen"}
            </button>

            {!user && (
              <>
                <div className="relative my-2">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-hairline" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-surface-2 px-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                      oder anmelden &amp; alle Wecker verwalten
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => signIn("google")}
                    className="flex items-center justify-center gap-2 rounded-lg border border-hairline bg-white px-3 py-2 text-xs font-medium text-foreground transition-colors hover:border-emerald/40"
                  >
                    <GoogleIcon className="size-4" /> Google
                  </button>
                  <button
                    type="button"
                    onClick={() => signIn("apple")}
                    className="flex items-center justify-center gap-2 rounded-lg border border-hairline bg-white px-3 py-2 text-xs font-medium text-foreground transition-colors hover:border-emerald/40"
                  >
                    <AppleIcon className="size-4" /> Apple
                  </button>
                </div>
              </>
            )}

            <a
              href={buildDeeplink(deal.asin)}
              target="_blank"
              rel="noopener sponsored"
              className="flex w-full items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground hover:text-emerald"
            >
              oder direkt auf Amazon ansehen <ExternalLink className="size-3" />
            </a>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
