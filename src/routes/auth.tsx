import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";
import { GoogleIcon, AppleIcon } from "@/components/BrandIcons";

export const Route = createFileRoute("/auth")({
  ssr: false,
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState<"google" | "apple" | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/watchlist" });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === "SIGNED_IN" && s) navigate({ to: "/watchlist" });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const signIn = async (provider: "google" | "apple") => {
    setErr(null);
    setLoading(provider);
    const result = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: window.location.origin + "/auth",
    });
    if (result.error) {
      setErr(result.error.message ?? "Login fehlgeschlagen");
      setLoading(null);
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/watchlist" });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-2xl border border-hairline bg-surface-2 p-8">
        <Link to="/" className="mb-6 flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl border border-emerald/20 bg-emerald-soft text-emerald-ink">
            <Bell className="size-4" strokeWidth={2.5} />
          </span>
          <span className="text-lg font-extrabold uppercase tracking-tight text-foreground">
            WHD<span className="text-emerald">FINDER</span>
          </span>
        </Link>
        <h1 className="font-display text-2xl font-bold">Anmelden</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Speichere Preiswecker und deine Watchlist geräteübergreifend.
        </p>
        <div className="mt-6 space-y-2">
          <button
            onClick={() => signIn("google")}
            disabled={loading !== null}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-hairline bg-white px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:border-emerald disabled:opacity-60"
          >
            <GoogleIcon className="size-4" />
            {loading === "google" ? "Lade…" : "Weiter mit Google"}
          </button>
          <button
            onClick={() => signIn("apple")}
            disabled={loading !== null}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-hairline bg-white px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:border-emerald disabled:opacity-60"
          >
            <AppleIcon className="size-4" />
            {loading === "apple" ? "Lade…" : "Weiter mit Apple"}
          </button>
        </div>
        {err && (
          <p className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {err}
          </p>
        )}
        <p className="mt-6 text-center text-[11px] text-muted-foreground">
          Du brauchst keinen Account, um Preiswecker zu stellen — eine Mailadresse reicht.
        </p>
      </div>
    </div>
  );
}
