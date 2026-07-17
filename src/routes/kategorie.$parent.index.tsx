import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { getCategoryPage } from "@/lib/categories.functions";
import { CategoryPageView } from "./kategorie.$parent.$child";

const SITE = "https://whdfinder.lovable.app";

const pageQuery = (parent: string) =>
  queryOptions({
    queryKey: ["category-page", parent, null] as const,
    queryFn: () => getCategoryPage({ data: { parent } }),
    staleTime: 60_000,
  });

export const Route = createFileRoute("/kategorie/$parent/")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/$parent", params: { parent: params.parent } });
  },
  loader: async ({ params, context }) => {
    const data = await context.queryClient.ensureQueryData(pageQuery(params.parent));
    if (!data) throw notFound();
    return data;
  },
  head: ({ params, loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Kategorie nicht gefunden" }, { name: "robots", content: "noindex" }] };
    }
    const c = loaderData.category;
    const url = `${SITE}/${params.parent}`;
    const title = c.seo_title || `${c.name} — Amazon Warehouse Deals | whdfinder.de`;
    const desc =
      c.seo_description ||
      `Aktuelle Amazon Warehouse Angebote in ${c.name}: B-Ware, Retouren & Vorführgeräte bis zu 60 % günstiger — mit Preisverlauf und kostenlosem Preiswecker.`;
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
              { "@type": "ListItem", position: 2, name: c.name, item: url },
            ],
          }),
        },
      ],
    };
  },
  component: TopCategoryPage,
  notFoundComponent: () => (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center">
      <h1 className="font-display text-2xl font-extrabold">Kategorie nicht gefunden</h1>
    </div>
  ),
  errorComponent: ({ error, reset }) => (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center">
      <h1 className="font-display text-2xl font-extrabold">Fehler</h1>
      <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
      <button onClick={() => reset()} className="mt-6 rounded-xl bg-foreground px-4 py-2 text-sm font-bold text-background">
        Erneut versuchen
      </button>
    </div>
  ),
});

function TopCategoryPage() {
  const params = Route.useParams();
  const { data } = useSuspenseQuery(pageQuery(params.parent));
  if (!data) return null;
  return <CategoryPageView data={data} />;
}
