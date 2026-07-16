import { createFileRoute, Outlet } from "@tanstack/react-router";

// Layout route — child routes (`.index` and `.$child`) render inside <Outlet />.
// Any per-page metadata / data loading lives on the child leaf routes so that
// /kategorie/$parent/$child does not render this parent's H1 and breadcrumb.
export const Route = createFileRoute("/kategorie/$parent")({
  component: () => <Outlet />,
});
