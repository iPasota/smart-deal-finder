import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

// Layout route — child routes (`.index` and `.$child`) render inside <Outlet />.
// Any per-page metadata / data loading lives on the child leaf routes so that
// /kategorie/$parent/$child does not render this parent's H1 and breadcrumb.
export const Route = createFileRoute("/kategorie/$parent")({
  beforeLoad: ({ location, params }) => {
    const parts = location.pathname.replace(/^\/kategorie\/?/, "").split("/").filter(Boolean);
    const child = parts[1];
    if (child) {
      throw redirect({ to: "/$parent/$child", params: { parent: params.parent, child } });
    }
    throw redirect({ to: "/$parent", params: { parent: params.parent } });
  },
  component: () => <Outlet />,
});
