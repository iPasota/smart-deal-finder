import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";

import { DealCard } from "@/components/DealCard";
import { Header } from "@/components/Header";
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
          <div className="prose prose-sm mt-6 max-w-3xl text-foreground/90">
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
          <div className="prose prose-sm mt-12 max-w-3xl text-foreground/90">
            <SimpleMarkdown src={data.category.outro_md} />
          </div>
        )}
      </main>
    </div>
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

// Minimal markdown: paragraphs + bold + italic + links. No dependency.
export function SimpleMarkdown({ src }: { src: string }) {
  const html = src
    .split(/\n{2,}/)
    .map((block) => {
      const escaped = block
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
      const inlined = escaped
        .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
        .replace(/\*([^*]+)\*/g, "<em>$1</em>")
        .replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '<a href="$2" rel="nofollow noopener" target="_blank">$1</a>');
      if (/^#\s+/.test(inlined)) return `<h2>${inlined.replace(/^#\s+/, "")}</h2>`;
      if (/^##\s+/.test(inlined)) return `<h3>${inlined.replace(/^##\s+/, "")}</h3>`;
      return `<p>${inlined.replace(/\n/g, "<br />")}</p>`;
    })
    .join("");
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
