import { createFileRoute } from "@tanstack/react-router";
import { queryOptions } from "@tanstack/react-query";
import { getPage } from "@/lib/pages.functions";
import { StaticPage } from "./impressum";

const pageQuery = queryOptions({
  queryKey: ["page", "datenschutz"] as const,
  queryFn: () => getPage({ data: { slug: "datenschutz" } }),
});

export const Route = createFileRoute("/datenschutz")({
  loader: ({ context }) => context.queryClient.ensureQueryData(pageQuery),
  head: () => ({
    meta: [
      { title: "Datenschutzerklärung | whdfinder.de" },
      { name: "description", content: "Datenschutzerklärung von whdfinder.de." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => <StaticPage slug="datenschutz" />,
});
