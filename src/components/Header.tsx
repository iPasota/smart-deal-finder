import { useState } from "react";
import { User } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { GoogleIcon, AppleIcon } from "./BrandIcons";

export function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="border-b border-hairline bg-background/85 backdrop-blur-lg">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 lg:px-6">
        <a href="/" className="flex items-baseline gap-2">
          <span className="font-display text-2xl leading-none text-foreground">warehaus</span>
          <span className="size-1.5 rounded-full bg-emerald" />
          <span className="font-mono-tabular text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            de
          </span>
        </a>

        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          <a href="/" className="hover:text-foreground">Deals</a>
          <a href="/" className="hover:text-foreground">Kategorien</a>
          <a href="/" className="hover:text-foreground">So funktioniert's</a>
        </nav>

        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-hairline bg-surface px-3 py-1.5 text-sm text-foreground transition-colors hover:border-emerald/40"
        >
          <User className="size-4" />
          Anmelden
        </button>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="border-hairline bg-popover">
          <SheetHeader>
            <SheetTitle className="font-display text-2xl">Anmelden</SheetTitle>
            <SheetDescription>
              Speichere deine Preiswecker und Watchlist geräteübergreifend.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-2">
            <button
              disabled
              title="In Phase 2 verfügbar"
              className="flex w-full items-center justify-center gap-3 rounded-lg border border-hairline bg-surface-2 px-4 py-3 text-sm font-medium transition-colors hover:border-emerald/40 disabled:opacity-70"
            >
              <GoogleIcon className="size-4" /> Weiter mit Google
            </button>
            <button
              disabled
              title="In Phase 2 verfügbar"
              className="flex w-full items-center justify-center gap-3 rounded-lg border border-hairline bg-surface-2 px-4 py-3 text-sm font-medium transition-colors hover:border-emerald/40 disabled:opacity-70"
            >
              <AppleIcon className="size-4" /> Weiter mit Apple
            </button>
            <p className="pt-4 text-center text-[11px] text-muted-foreground">
              Du brauchst keinen Account, um Preiswecker zu stellen — eine Mailadresse reicht.
            </p>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}
