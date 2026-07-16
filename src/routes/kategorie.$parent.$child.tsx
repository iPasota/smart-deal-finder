import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";

import { DealCard } from "@/components/DealCard";
import { Header } from "@/components/Header";
import { useLazyList } from "@/hooks/use-lazy-list";
import { getCategoryPage } from "@/lib/categories.functions";
import { CONDITION_LABEL, type Condition } from "@/lib/mock-deals";

const SITE = "https://whdfinder.lovable.app";

const pageQuery = (parent: string, child?: string) =>
  queryOptions({
    queryKey: ["category-page", parent, child ?? null] as const,
    queryFn: () => getCategoryPage({ data: { parent, child } }),
    staleTime: 60_000,
  });

export const Route = createFileRoute("/kategorie/$parent/$child")({
  loader: async ({ params, context }) => {
    const data = await context.queryClient.ensureQueryData(pageQuery(params.parent, params.child));
    if (!data) throw notFound();
    return data;
  },
  head: ({ params, loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Kategorie nicht gefunden" }, { name: "robots", content: "noindex" }] };
    }
    const c = loaderData.category;
    const url = `${SITE}/kategorie/${params.parent}/${params.child}`;
    const title = c.seo_title || `${c.name} — Amazon Warehouse Deals | whdfinder.de`;
    const desc =
      c.seo_description ||
      `Alle aktuellen Amazon Warehouse Angebote in ${c.name}: B-Ware & Retouren bis zu 60 % günstiger, inkl. Preisverlauf und Preiswecker.`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "website" },
        { property: "og:url", content: url },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Startseite", item: SITE },
              ...loaderData.breadcrumb.map((b, i) => ({
                "@type": "ListItem",
                position: i + 2,
                name: b.name,
                item: `${SITE}/kategorie/${loaderData.breadcrumb.slice(0, i + 1).map((x) => x.slug).join("/")}`,
              })),
            ],
          }),
        },
      ],
    };
  },
  component: CategoryPage,
  errorComponent: ({ error, reset }) => (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center">
      <h1 className="font-display text-2xl font-extrabold">Fehler</h1>
      <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
      <button onClick={() => reset()} className="mt-6 rounded-xl bg-foreground px-4 py-2 text-sm font-bold text-background">
        Erneut versuchen
      </button>
    </div>
  ),
  notFoundComponent: () => (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center">
      <h1 className="font-display text-2xl font-extrabold">Kategorie nicht gefunden</h1>
      <Link to="/" className="mt-6 inline-block rounded-xl bg-foreground px-4 py-2 text-sm font-bold text-background">
        Zur Startseite
      </Link>
    </div>
  ),
});

function CategoryPage() {
  const params = Route.useParams();
  const { data } = useSuspenseQuery(pageQuery(params.parent, params.child));
  if (!data) return null;
  return <CategoryPageView data={data} />;
}

export function CategoryPageView({
  data,
}: {
  data: NonNullable<Awaited<ReturnType<typeof getCategoryPage>>>;
}) {
  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-40">
        <Header />
      </div>
      <main className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
        <Breadcrumbs items={data.breadcrumb} />
        <h1 className="mt-3 font-display text-3xl font-black tracking-tight sm:text-4xl">
          {data.category.name}
        </h1>
        {data.category.intro_md && (
          <div className="prose prose-sm mt-6 max-w-none text-foreground/90">
            <SimpleMarkdown src={data.category.intro_md} />
          </div>
        )}


        {data.childCategories.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2">
            {data.childCategories.map((c) => (
              <Link
                key={c.id}
                to="/kategorie/$parent/$child"
                params={{ parent: data.breadcrumb[0].slug, child: c.slug }}
                className="rounded-lg border border-hairline bg-surface px-3 py-1.5 text-xs font-bold uppercase tracking-tight text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
              >
                {c.name}
              </Link>
            ))}
          </div>
        )}

        <CategoryDealsSection deals={data.deals} />


        {data.category.outro_md && (
          <div className="prose prose-sm mt-12 max-w-none text-foreground/90">
            <SimpleMarkdown src={data.category.outro_md} />
          </div>
        )}

      </main>
    </div>
  );
}

type CategoryDeal = { id: string; condition: Condition; priceCents: number; newPriceCents: number };

function CategoryDealsSection<T extends CategoryDeal>({ deals }: { deals: T[] }) {
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [minDiscount, setMinDiscount] = useState(0);

  const filtered = useMemo(() => {
    return deals.filter((d) => {
      if (conditions.length > 0 && !conditions.includes(d.condition)) return false;
      if (minDiscount > 0) {
        const pct = d.newPriceCents > 0
          ? Math.round((1 - d.priceCents / d.newPriceCents) * 100)
          : 0;
        if (pct < minDiscount) return false;
      }
      return true;
    });
  }, [deals, conditions, minDiscount]);

  const condCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const d of deals) m[d.condition] = (m[d.condition] ?? 0) + 1;
    return m;
  }, [deals]);

  const toggleCond = (c: Condition) =>
    setConditions((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));

  const hasAny = deals.length > 0;

  return (
    <div className="mt-8">
      {hasAny && (
        <div className="mb-5 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-xl border border-hairline bg-surface/60 px-4 py-3">
          <FilterGroup label="Zustand" accent="bg-emerald">
            {(Object.keys(CONDITION_LABEL) as Condition[]).map((c) => {
              const active = conditions.includes(c);
              const n = condCounts[c] ?? 0;
              if (!active && n === 0) return null;
              return (
                <FilterChip key={c} active={active} tone="emerald" onClick={() => toggleCond(c)}>
                  {CONDITION_LABEL[c]}
                </FilterChip>
              );
            })}
          </FilterGroup>
          <FilterGroup label="Rabatt" accent="bg-amber">
            {[0, 10, 20, 30, 40].map((d) => (
              <FilterChip
                key={d}
                active={minDiscount === d}
                tone="amber"
                onClick={() => setMinDiscount(d)}
              >
                {d === 0 ? "Alle" : `${d}%+`}
              </FilterChip>
            ))}
          </FilterGroup>
          <span className="font-mono-tabular ml-auto rounded-lg bg-surface-2 px-2.5 py-1 text-xs font-bold text-muted-foreground">
            {filtered.length} von {deals.length}
          </span>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="grid place-items-center rounded-2xl border border-dashed border-hairline py-24 text-center">
          <div>
            <div className="font-display text-2xl font-extrabold">
              {hasAny ? "Keine Deals mit diesen Filtern" : "Aktuell keine Deals"}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {hasAny ? "Filter anpassen oder zurücksetzen." : "Wir aktualisieren mehrmals täglich — schau bald wieder vorbei."}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {(filtered as unknown as import("@/lib/mock-deals").Deal[]).map((d) => (
            <DealCard key={d.id} deal={d} />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterGroup({ label, accent, children }: { label: string; accent: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-foreground/80">
        <span className={`inline-block h-3.5 w-1 rounded-full ${accent}`} />
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function FilterChip({
  children,
  active,
  onClick,
  tone,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  tone: "emerald" | "amber";
}) {
  const activeCls =
    tone === "amber"
      ? "border-amber bg-amber text-amber-foreground shadow-sm"
      : "border-emerald bg-emerald text-emerald-foreground shadow-sm";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`whitespace-nowrap rounded-lg border px-2.5 py-1 text-[11px] font-bold uppercase tracking-tight transition-all ${
        active
          ? activeCls
          : "border-hairline bg-surface text-muted-foreground hover:border-foreground/40 hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

export function Breadcrumbs({ items }: { items: { slug: string; name: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
      <Link to="/" className="hover:text-foreground">Start</Link>
      {items.map((c, i) => {
        const parentSlug = items[0].slug;
        const isLast = i === items.length - 1;
        return (
          <span key={c.slug} className="flex items-center gap-1">
            <ChevronRight className="size-3" />
            {isLast ? (
              <span className="font-semibold text-foreground">{c.name}</span>
            ) : i === 0 ? (
              <Link to="/kategorie/$parent" params={{ parent: parentSlug }} className="hover:text-foreground">
                {c.name}
              </Link>
            ) : (
              <span>{c.name}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
}

// Markdown + safe HTML: admin-authored content. Strips <script>/<iframe>/<style>
// and inline event handlers (on*=), then converts markdown syntax on remaining text.
function sanitizeHtml(input: string): string {
  return input
    // remove dangerous blocks entirely
    .replace(/<\s*(script|style|iframe|object|embed|link|meta)[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    .replace(/<\s*(script|style|iframe|object|embed|link|meta)[^>]*\/?>/gi, "")
    // strip inline event handlers  onclick="..."  onLoad='...'  onerror=foo
    .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, "")
    .replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, "")
    // neutralize javascript: URLs
    .replace(/(href|src)\s*=\s*"(\s*javascript:[^"]*)"/gi, '$1="#"')
    .replace(/(href|src)\s*=\s*'(\s*javascript:[^']*)'/gi, "$1='#'");
}

// Markdown-lite: paragraphs, **bold**, *italic*, [text](url), plus raw HTML
// tags (sanitized) so admins can use <h2>, <ul>, <table>, <a> etc. directly.
export function SimpleMarkdown({ src }: { src: string }) {
  // If the source already contains block-level HTML, render as-is (sanitized).
  const hasHtml = /<\s*(h[1-6]|p|ul|ol|li|table|div|section|article|figure|img|blockquote|pre)\b/i.test(src);
  if (hasHtml) {
    return <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(src) }} />;
  }
  const html = src
    .split(/\n{2,}/)
    .map((block) => {
      const inlined = block
        .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
        .replace(/\*([^*]+)\*/g, "<em>$1</em>")
        .replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '<a href="$2" rel="nofollow noopener" target="_blank">$1</a>');
      if (/^#\s+/.test(inlined)) return `<h2>${inlined.replace(/^#\s+/, "")}</h2>`;
      if (/^##\s+/.test(inlined)) return `<h3>${inlined.replace(/^##\s+/, "")}</h3>`;
      return `<p>${inlined.replace(/\n/g, "<br />")}</p>`;
    })
    .join("");
  return <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }} />;
}

