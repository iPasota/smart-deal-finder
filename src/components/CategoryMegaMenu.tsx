import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import * as NavigationMenu from "@radix-ui/react-navigation-menu";

import { getCategoryTree, type CategoryTreeNode } from "@/lib/categories.functions";

// Hover-driven, keyboard-accessible mega menu. Renders up to 3 levels:
// L1 (trigger) → L2 (column headings, link to /kategorie/$parent/$child)
// → L3 (leaf links; currently not present in the dataset but supported).
export function CategoryMegaMenu() {
  const { data: tree = [] } = useQuery({
    queryKey: ["category-tree"],
    queryFn: () => getCategoryTree(),
    staleTime: 5 * 60_000,
  });

  if (tree.length === 0) return null;

  return (
    <div className="relative z-50 border-b border-hairline bg-background/85 backdrop-blur-lg">
      <div className="mx-auto flex max-w-7xl items-center px-4 lg:px-6">
        <NavigationMenu.Root
          delayDuration={80}
          skipDelayDuration={200}
          className="relative z-50 w-full"
        >
          <NavigationMenu.List className="flex flex-wrap items-center gap-1">
            {tree.map((top) => (
              <TopLevelItem key={top.id} node={top} />
            ))}
          </NavigationMenu.List>

          <div className="absolute left-0 right-0 top-full z-50 flex justify-center">
            <NavigationMenu.Viewport
              className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 relative z-50 mt-0 h-[var(--radix-navigation-menu-viewport-height)] w-full origin-top overflow-hidden border-b border-hairline bg-background shadow-xl transition-[height,width] duration-200"
            />
          </div>
        </NavigationMenu.Root>
      </div>
    </div>
  );
}

function TopLevelItem({ node }: { node: CategoryTreeNode }) {
  const hasChildren = node.children.length > 0;

  return (
    <NavigationMenu.Item>
      {hasChildren ? (
        <>
          <NavigationMenu.Trigger
            className="group inline-flex items-center gap-1 rounded-md px-3 py-3 text-sm font-semibold text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-emerald data-[state=open]:text-foreground"
          >
            {node.name}
            <ChevronDown
              aria-hidden
              className="size-3.5 transition-transform duration-200 group-data-[state=open]:rotate-180"
            />
          </NavigationMenu.Trigger>


          <NavigationMenu.Content className="data-[motion=from-end]:animate-in data-[motion=from-start]:animate-in data-[motion=to-end]:animate-out data-[motion=to-start]:animate-out data-[motion=from-end]:slide-in-from-right-4 data-[motion=from-start]:slide-in-from-left-4 data-[motion=to-end]:slide-out-to-right-4 data-[motion=to-start]:slide-out-to-left-4 absolute left-0 top-0 w-full">
            <MegaPanel parent={node} />
          </NavigationMenu.Content>
        </>
      ) : (
        <NavigationMenu.Link asChild>
          <Link
            to="/kategorie/$parent"
            params={{ parent: node.slug }}
            className="inline-flex items-center rounded-md px-3 py-3 text-sm font-semibold text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-emerald"
          >
            {node.name}
          </Link>
        </NavigationMenu.Link>
      )}
    </NavigationMenu.Item>
  );
}

function MegaPanel({ parent }: { parent: CategoryTreeNode }) {
  return (
    <div className="mx-auto grid w-full max-w-7xl gap-x-8 gap-y-5 px-4 py-6 sm:grid-cols-2 lg:grid-cols-4 lg:px-6">
      <div className="col-span-full flex items-baseline justify-between border-b border-hairline pb-3">
        <NavigationMenu.Link asChild>
          <Link
            to="/kategorie/$parent"
            params={{ parent: parent.slug }}
            className="text-xs font-bold uppercase tracking-widest text-foreground hover:text-emerald-ink"
          >
            Alle {parent.name} ({parent.count})
          </Link>
        </NavigationMenu.Link>
      </div>

      {parent.children.map((child) => (
        <div key={child.id} className="min-w-0">
          <NavigationMenu.Link asChild>
            <Link
              to="/kategorie/$parent/$child"
              params={{ parent: parent.slug, child: child.slug }}
              className="block truncate text-sm font-bold text-foreground hover:text-emerald-ink"
            >
              {child.name}
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                ({child.count})
              </span>
            </Link>
          </NavigationMenu.Link>

          {child.children.length > 0 && (
            <ul className="mt-2 space-y-1.5">
              {child.children.slice(0, 6).map((leaf) => (
                <li key={leaf.id}>
                  <NavigationMenu.Link asChild>
                    <Link
                      to="/kategorie/$parent/$child"
                      params={{ parent: parent.slug, child: leaf.slug }}
                      className="block truncate text-xs text-muted-foreground hover:text-foreground"
                    >
                      {leaf.name}
                      <span className="ml-1 text-[10px] font-normal text-muted-foreground/70">
                        ({leaf.count})
                      </span>
                    </Link>
                  </NavigationMenu.Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
