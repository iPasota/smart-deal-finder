import { useState } from "react";
import { Bell, User, LogOut, BookmarkCheck } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { GoogleIcon, AppleIcon } from "./BrandIcons";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { MARKETPLACE_LIST } from "@/lib/marketplace";

export function Header() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<"google" | "apple" | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const { user } = useAuth();

  const signIn = async (provider: "google" | "apple") => {
    setErr(null);
    setLoading(provider);
    const result = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: window.location.origin + "/auth",
    });
    if (result.error) {
      setErr(result.error.message ?? "Login fehlgeschlagen");
      setLoading(null);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-background/85 backdrop-blur-lg">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 lg:px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl border border-emerald/20 bg-emerald-soft text-emerald-ink">
            <Bell className="size-4" strokeWidth={2.5} />
          </span>
          <span className="text-lg font-extrabold uppercase tracking-tight text-foreground">
            WHD<span className="text-emerald">FINDER</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
          <Link to="/" className="hover:text-foreground">Deals</Link>
          {user && (
            <Link to="/watchlist" className="hover:text-foreground">Watchlist</Link>
          )}
        </nav>

        {/* Country / Marketplace switcher — MVP: nur DE aktiv */}
        <div className="ml-auto mr-2 hidden items-center gap-1 rounded-lg border border-hairline bg-surface p-1 md:flex">
          {MARKETPLACE_LIST.map((m) => (
            <button
              key={m.code}
              type="button"
              disabled={!m.active}
              title={m.active ? m.label : `${m.label} – bald verfügbar`}
              className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-bold uppercase tracking-wider transition-colors ${
                m.active
                  ? "bg-foreground text-background"
                  : "cursor-not-allowed text-muted-foreground/50"
              }`}
            >
              <span aria-hidden>{m.flag}</span>
              {m.code}
            </button>
          ))}
        </div>


        {user ? (
          <div className="flex items-center gap-2">
            <Link
              to="/watchlist"
              className="inline-flex items-center gap-2 rounded-lg border border-hairline bg-surface px-3 py-1.5 text-sm font-semibold text-foreground hover:border-emerald hover:text-emerald-ink"
            >
              <BookmarkCheck className="size-4" />
              <span className="hidden sm:inline">Watchlist</span>
            </Link>
            <button
              onClick={signOut}
              className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              aria-label="Abmelden"
              title="Abmelden"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-hairline bg-surface px-3 py-1.5 text-sm font-semibold text-foreground transition-colors hover:border-emerald hover:text-emerald-ink"
          >
            <User className="size-4" />
            Anmelden
          </button>
        )}
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="border-hairline bg-popover">
          <SheetHeader>
            <SheetTitle className="text-2xl font-extrabold tracking-tight">Anmelden</SheetTitle>
            <SheetDescription>
              Speichere deine Preiswecker und Watchlist geräteübergreifend.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-2">
            <button
              onClick={() => signIn("google")}
              disabled={loading !== null}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-hairline bg-surface-2 px-4 py-3 text-sm font-semibold transition-colors hover:border-emerald disabled:opacity-70"
            >
              <GoogleIcon className="size-4" /> {loading === "google" ? "Lade…" : "Weiter mit Google"}
            </button>
            <button
              onClick={() => signIn("apple")}
              disabled={loading !== null}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-hairline bg-surface-2 px-4 py-3 text-sm font-semibold transition-colors hover:border-emerald disabled:opacity-70"
            >
              <AppleIcon className="size-4" /> {loading === "apple" ? "Lade…" : "Weiter mit Apple"}
            </button>
            {err && (
              <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {err}
              </p>
            )}
            <p className="pt-4 text-center text-[11px] text-muted-foreground">
              Du brauchst keinen Account, um Preiswecker zu stellen — eine Mailadresse reicht.
            </p>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}
