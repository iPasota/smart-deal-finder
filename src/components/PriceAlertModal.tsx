import { useState } from "react";
import { Bell, Check, ExternalLink } from "lucide-react";

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

export function PriceAlertModal({
  deal,
  open,
  onOpenChange,
}: {
  deal: Deal;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [email, setEmail] = useState("");
  const [target, setTarget] = useState(Math.round(deal.priceCents * 0.9) / 100);
  const [sent, setSent] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    // Phase 1 stub. Phase 5: createEmailWatch + Double-Opt-In Mail.
    setSent(true);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setSent(false); }}>
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

        {sent ? (
          <div className="mt-2 flex flex-col items-center gap-3 rounded-lg border border-hairline bg-white py-6 text-center">
            <div className="grid size-12 place-items-center rounded-full bg-emerald-soft text-emerald">
              <Check className="size-6" />
            </div>
            <p className="text-sm text-foreground">
              Fast geschafft — wir haben dir eine Bestätigungsmail an{" "}
              <span className="text-emerald">{email}</span> geschickt.
            </p>
            <p className="text-xs text-muted-foreground">
              Klick den Link in der Mail, um den Wecker zu aktivieren.
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-2 space-y-4">
            <div className="rounded-lg border border-hairline bg-white p-3">
              <div className="flex items-center gap-3">
                <img
                  src={deal.imageUrl}
                  alt=""
                  className="size-12 rounded bg-white object-contain"
                />
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
                <span className="font-mono-tabular pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  €
                </span>
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

            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald px-4 py-2.5 text-sm font-semibold text-emerald-foreground transition-transform hover:scale-[1.01]"
            >
              Wecker stellen
            </button>

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
              <SocialBtn icon={<GoogleIcon className="size-4" />} label="Google" />
              <SocialBtn icon={<AppleIcon className="size-4" />} label="Apple" />
            </div>

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

function SocialBtn({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      disabled
      title="In Phase 2 verfügbar"
      className="flex items-center justify-center gap-2 rounded-lg border border-hairline bg-white px-3 py-2 text-xs font-medium text-foreground transition-colors hover:border-emerald/40 disabled:opacity-60"
    >
      {icon}
      {label}
    </button>
  );
}
