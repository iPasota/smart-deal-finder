import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { DealCard } from "@/components/DealCard";
import { Header } from "@/components/Header";
import { DEFAULT_FILTERS, FilterBar, type Filters } from "@/components/FilterBar";
import { SeoContent } from "@/components/SeoContent";
import { discountPct, MOCK_DEALS } from "@/lib/mock-deals";

const FAQ_JSONLD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Was sind Amazon Warehouse Deals?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Amazon Warehouse (auch Amazon Outlet) verkauft geprüfte Retouren, Lagerbestände mit Verpackungsschäden und Vorführgeräte als B-Ware — mit voller Garantie und Rückgaberecht, oft 20–60 % günstiger als Neuware.",
      },
    },
    {
      "@type": "Question",
      name: "Sind Amazon Warehouse Deals sicher?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Ja. Du kaufst direkt bei Amazon mit voller Garantie und 30-tägigem Rückgaberecht.",
      },
    },
    {
      "@type": "Question",
      name: "Was kostet whdfinder.de?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Die Nutzung von whdfinder.de inklusive Preisverlauf und Preiswecker ist komplett kostenlos.",
      },
    },
    {
      "@type": "Question",
      name: "Was bedeutet der Zustand 'Wie neu'?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Die Originalverpackung kann leicht beschädigt sein, das Produkt selbst ist unbenutzt und in einwandfreiem Zustand.",
      },
    },
  ],
};

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Amazon Warehouse Deals & B-Ware kaufen | whdfinder.de" },
      {
        name: "description",
        content:
          "Amazon Warehouse Deals, Retouren & refurbished kaufen — bis zu 60 % günstiger. Mit Preisverlauf, kostenlosem Preiswecker und Filter nach Zustand & Kategorie.",
      },
      { property: "og:title", content: "Amazon Warehouse Deals & B-Ware kaufen | whdfinder.de" },
      {
        property: "og:description",
        content:
          "Alle Amazon Warehouse Angebote auf einen Blick — mit Preisverlauf und Preiswecker. B-Ware, Retouren und refurbished Produkte clever kaufen.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/" },
    ],
    links: [{ rel: "canonical", href: "/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(FAQ_JSONLD),
      },
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

      <FilterBar filters={filters} onChange={setFilters} count={deals.length} />

      <main className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
        {deals.length === 0 ? (
          <div className="grid place-items-center rounded-2xl border border-dashed border-hairline py-24 text-center">
            <div>
              <div className="font-display text-2xl font-extrabold">Keine Deals gefunden</div>
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
              <span className="font-display text-lg font-extrabold text-foreground">whdfinder.de</span>
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
