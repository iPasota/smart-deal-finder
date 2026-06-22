import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { DealCard } from "@/components/DealCard";
import { Header } from "@/components/Header";
import { DEFAULT_FILTERS, FilterBar, type Filters } from "@/components/FilterBar";
import { discountPct, MOCK_DEALS } from "@/lib/mock-deals";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "warehaus.de — Amazon Warehouse Deals, schön sortiert" },
      {
        name: "description",
        content:
          "Die beste Übersicht über Amazon Warehouse Angebote. Mit Preisverlauf, Preiswecker und übersichtlichen Filtern.",
      },
      { property: "og:title", content: "warehaus.de — Amazon Warehouse Deals" },
      {
        property: "og:description",
        content: "Alle Amazon Warehouse Deals auf einen Blick — mit Preisverlauf und Preiswecker.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Index,
});

function Index() {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);

  const deals = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    const filtered = MOCK_DEALS.filter((d) => {
      if (filters.category !== "Alle" && d.category !== filters.category) return false;
      if (filters.conditions.length && !filters.conditions.includes(d.condition)) return false;
      if (discountPct(d) < filters.minDiscount) return false;
      if (d.priceCents > filters.maxPrice * 100) return false;
      if (q) {
        const hay = `${d.brand} ${d.title} ${d.asin}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    switch (filters.sort) {
      case "discount":
        filtered.sort((a, b) => discountPct(b) - discountPct(a));
        break;
      case "newest":
        filtered.sort((a, b) => b.firstSeenAt.localeCompare(a.firstSeenAt));
        break;
      case "price_asc":
        filtered.sort((a, b) => a.priceCents - b.priceCents);
        break;
      case "price_desc":
        filtered.sort((a, b) => b.priceCents - a.priceCents);
        break;
    }
    return filtered;
  }, [filters]);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero strip */}
      <section className="border-b border-hairline">
        <div className="mx-auto max-w-7xl px-4 py-10 lg:px-6 lg:py-14">
          <h1 className="font-display text-4xl leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Amazon Warehouse
            <span className="text-emerald">.</span> schöner. schneller. sortiert.
          </h1>
          <p className="mt-4 max-w-2xl text-base text-muted-foreground">
            Alle aktuellen Warehouse-Angebote in Elektronik — mit Preisverlauf, Preiswecker
            und einem Klick direkt zum Deal.
          </p>
        </div>
      </section>

      <FilterBar filters={filters} onChange={setFilters} count={deals.length} />

      <main className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
        {deals.length === 0 ? (
          <div className="grid place-items-center rounded-xl border border-dashed border-hairline py-24 text-center">
            <div>
              <div className="font-display text-2xl">Keine Deals gefunden</div>
              <p className="mt-2 text-sm text-muted-foreground">
                Filter lockern oder andere Kategorie wählen.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {deals.map((d) => (
              <DealCard key={d.id} deal={d} />
            ))}
          </div>
        )}
      </main>

      <footer className="mt-16 border-t border-hairline">
        <div className="mx-auto max-w-7xl px-4 py-10 text-xs text-muted-foreground lg:px-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="font-display text-lg text-foreground">warehaus.de</span>
              <span className="ml-2">— inoffiziell. Wir sind kein Teil von Amazon.</span>
            </div>
            <div className="flex gap-4">
              <a href="/" className="hover:text-foreground">Impressum</a>
              <a href="/" className="hover:text-foreground">Datenschutz</a>
              <a href="/" className="hover:text-foreground">Affiliate-Hinweis</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
