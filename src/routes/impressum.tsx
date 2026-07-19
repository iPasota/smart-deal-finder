import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { queryOptions } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { getPage, type PageRow } from "@/lib/pages.functions";
import { sanitizePageHtml } from "@/lib/sanitize";

const pageQuery = (slug: string) =>
  queryOptions({
    queryKey: ["page", slug] as const,
    queryFn: () => getPage({ data: { slug } }),
  });

export const Route = createFileRoute("/impressum")({
  loader: ({ context }) => context.queryClient.ensureQueryData(pageQuery("impressum")),
  head: () => ({
    meta: [
      { title: "Impressum | whdfinder.de" },
      { name: "description", content: "Impressum & Anbieterkennzeichnung von whdfinder.de." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => <StaticPage slug="impressum" />,
});

export function StaticPage({ slug }: { slug: string }) {
  const { data } = useSuspenseQuery(pageQuery(slug));
  const page: PageRow | null = data;
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-12 lg:px-6">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          {page?.title ?? "Seite"}
        </h1>
        <div
          className="prose prose-neutral mt-6 max-w-none text-base leading-relaxed text-foreground/85"
          dangerouslySetInnerHTML={{ __html: sanitizePageHtml(page?.body_html ?? "") }}
        />
      </main>
    </div>
  );
}
