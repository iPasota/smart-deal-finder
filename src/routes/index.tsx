import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { DealCard } from "@/components/DealCard";
import { Header } from "@/components/Header";
import { DEFAULT_FILTERS, FilterBar, type Filters } from "@/components/FilterBar";
import { SeoContent } from "@/components/SeoContent";
import { useLazyList } from "@/hooks/use-lazy-list";
import { discountPct, type Condition, type Deal } from "@/lib/mock-deals";
import { SHOPS } from "@/lib/shops";
import { getPublicDeals } from "@/lib/deals.functions";
import { getTopCategoryLinks } from "@/lib/categories.functions";

const dealsQuery = {
  queryKey: ["deals", "public"] as const,
  queryFn: () => getPublicDeals(),
  staleTime: 60_000,
};

const topCategoriesQuery = {
  queryKey: ["top-categories"] as const,
  queryFn: () => getTopCategoryLinks(),
  staleTime: 5 * 60_000,
};

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
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(dealsQuery),
      context.queryClient.ensureQueryData(topCategoriesQuery),
    ]);
  },
  component: Index,
  errorComponent: ({ error, reset }) => (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center">
      <h1 className="font-display text-2xl font-extrabold">Deals konnten nicht geladen werden</h1>
      <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
      <button
        onClick={() => reset()}
        className="mt-6 rounded-xl bg-foreground px-4 py-2 text-sm font-bold text-background"
      >
        Erneut versuchen
      </button>
    </div>
  ),
  notFoundComponent: () => <div className="p-24 text-center">Seite nicht gefunden</div>,
});

function Index() {
  const { data: allDeals } = useSuspenseQuery(dealsQuery);
  const { data: topCategories } = useSuspenseQuery(topCategoriesQuery);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);

  const deals = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    const filtered = allDeals.filter((d: Deal) => {
      if (filters.shops.length && !filters.shops.includes(d.shop)) return false;
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

    const conditionRank: Record<Condition, number> = {
      like_new: 0,
      very_good: 1,
      good: 2,
      acceptable: 3,
    };

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
      case "shop":
        filtered.sort((a, b) => SHOPS[a.shop].name.localeCompare(SHOPS[b.shop].name));
        break;
      case "condition":
        filtered.sort((a, b) => conditionRank[a.condition] - conditionRank[b.condition]);
        break;
    }
    return filtered;
  }, [filters, allDeals]);

  // Zähle mögliche Ergebnisse pro Filteroption – jede Dimension ignoriert sich selbst,
  // damit man nicht in eine leere Auswahl klickt.
  const availability = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    const base = (d: Deal, opts: { skipShop?: boolean; skipCategory?: boolean; skipCondition?: boolean; skipDiscount?: boolean }) => {
      if (!opts.skipShop && filters.shops.length && !filters.shops.includes(d.shop)) return false;
      if (!opts.skipCategory && filters.category !== "Alle" && d.category !== filters.category) return false;
      if (!opts.skipCondition && filters.conditions.length && !filters.conditions.includes(d.condition)) return false;
      if (!opts.skipDiscount && discountPct(d) < filters.minDiscount) return false;
      if (d.priceCents > filters.maxPrice * 100) return false;
      if (q) {
        const hay = `${d.brand} ${d.title} ${d.asin}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    };
    const categories: Record<string, number> = {};
    const conditions: Record<string, number> = {};
    const shops: Record<string, number> = {};
    const discounts: Record<number, number> = { 0: 0, 10: 0, 20: 0, 30: 0, 40: 0 };
    for (const d of allDeals) {
      if (base(d, { skipCategory: true })) categories[d.category] = (categories[d.category] ?? 0) + 1;
      if (base(d, { skipCondition: true })) conditions[d.condition] = (conditions[d.condition] ?? 0) + 1;
      if (base(d, { skipShop: true })) shops[d.shop] = (shops[d.shop] ?? 0) + 1;
      if (base(d, { skipDiscount: true })) {
        const p = discountPct(d);
        for (const t of [0, 10, 20, 30, 40]) if (p >= t) discounts[t] = (discounts[t] ?? 0) + 1;
      }
    }
    // "Alle" bekommt die Summe über alle Kategorien (unter aktuellen sonstigen Filtern)
    categories["Alle"] = Object.values(categories).reduce((a, b) => a + b, 0);
    return { categories, conditions, shops, discounts };
  }, [filters, allDeals]);


  const { visible, sentinelRef, hasMore } = useLazyList(deals, 48, 48);

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-40">
        <Header
          search={filters.search}
          onSearchChange={(v) => setFilters({ ...filters, search: v })}
        />
        <FilterBar filters={filters} onChange={setFilters} count={deals.length} availability={availability} />
      </div>

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
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {deals.slice(0, visible).map((d) => (
                <DealCard key={d.id} deal={d} />
              ))}
            </div>
            {hasMore && (
              <div
                ref={sentinelRef}
                className="mt-8 py-8 text-center text-xs text-muted-foreground"
              >
                Lade weitere Deals… ({visible} von {deals.length})
              </div>
            )}
          </>
        )}
      </main>


      <SeoContent />


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
