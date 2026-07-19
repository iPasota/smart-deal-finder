import { Link } from "@tanstack/react-router";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-hairline bg-surface">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-xs text-muted-foreground lg:px-6">
        <span>© {new Date().getFullYear()} whdfinder.de — Unabhängiger Preisvergleich.</span>
        <nav className="flex items-center gap-4">
          <Link to="/impressum" className="font-semibold hover:text-foreground">Impressum</Link>
          <Link to="/datenschutz" className="font-semibold hover:text-foreground">Datenschutz</Link>
        </nav>
      </div>
    </footer>
  );
}
