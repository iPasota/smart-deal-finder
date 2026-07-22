import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/unsubscribe")({
  ssr: false,
  component: UnsubscribePage,
  head: () => ({
    meta: [
      { title: "Abmelden – whdfinder" },
      { name: "description", content: "E-Mail-Benachrichtigungen abmelden." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

function UnsubscribePage() {
  const [state, setState] = useState<"loading" | "valid" | "already" | "invalid" | "done" | "error">("loading");
  const [errMsg, setErrMsg] = useState("");
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const t = new URL(window.location.href).searchParams.get("token");
    setToken(t);
    if (!t) { setState("invalid"); return; }
    fetch(`/email/unsubscribe?token=${encodeURIComponent(t)}`)
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) { setState("invalid"); return; }
        if (j.valid) setState("valid");
        else if (j.reason === "already_unsubscribed") setState("already");
        else setState("invalid");
      })
      .catch(() => setState("error"));
  }, []);

  const confirm = async () => {
    if (!token) return;
    setState("loading");
    try {
      const r = await fetch("/email/unsubscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const j = await r.json();
      if (r.ok && j.success) setState("done");
      else if (j.reason === "already_unsubscribed") setState("already");
      else { setState("error"); setErrMsg(j.error ?? "Unbekannter Fehler"); }
    } catch (e) {
      setState("error");
      setErrMsg(e instanceof Error ? e.message : "Netzwerkfehler");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-4 py-24">
        <div className="rounded-2xl border border-hairline bg-surface p-8 text-center">
          <h1 className="font-display text-2xl font-extrabold">whdfinder E-Mails</h1>

          {state === "loading" && <div className="mt-6 flex justify-center"><Loader2 className="size-6 animate-spin" /></div>}

          {state === "valid" && (
            <>
              <p className="mt-4 text-sm text-muted-foreground">Möchtest du dich von allen whdfinder-Preisweckern abmelden?</p>
              <button onClick={confirm} className="mt-6 rounded-lg bg-foreground px-5 py-2.5 text-sm font-bold text-background">Ja, abmelden</button>
            </>
          )}

          {state === "done" && (
            <p className="mt-4 text-sm text-emerald">Du wurdest erfolgreich abgemeldet. Du erhältst keine weiteren E-Mails.</p>
          )}

          {state === "already" && (
            <p className="mt-4 text-sm text-muted-foreground">Diese Adresse ist bereits abgemeldet.</p>
          )}

          {state === "invalid" && (
            <p className="mt-4 text-sm text-red-700">Der Abmelde-Link ist ungültig oder abgelaufen.</p>
          )}

          {state === "error" && (
            <p className="mt-4 text-sm text-red-700">Fehler: {errMsg}</p>
          )}
        </div>
      </div>
    </div>
  );
}
