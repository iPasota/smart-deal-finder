import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Menu, ChevronRight, Loader2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { getCategoryTree, type CategoryTreeNode } from "@/lib/categories.functions";

export function CategoriesMenu() {
  const [open, setOpen] = useState(false);
  const fetchTree = useServerFn(getCategoryTree);
  const { data, isLoading } = useQuery({
    queryKey: ["category-tree"] as const,
    queryFn: () => fetchTree(),
    staleTime: 60_000,
  });

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Alle Kategorien"
        className="inline-flex items-center gap-2 rounded-lg border border-hairline bg-surface px-3 py-1.5 text-sm font-semibold text-foreground transition-colors hover:border-emerald hover:text-emerald-ink"
      >
        <Menu className="size-4" strokeWidth={2.5} />
        <span className="hidden sm:inline">Kategorien</span>
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full max-w-md overflow-y-auto border-hairline bg-popover">
          <SheetHeader>
            <SheetTitle className="font-display text-2xl font-extrabold">Kategorien</SheetTitle>
            <SheetDescription>Nur Kategorien mit verfügbaren Deals.</SheetDescription>
          </SheetHeader>
          <div className="mt-4">
            {isLoading ? (
              <div className="grid place-items-center py-16 text-muted-foreground">
                <Loader2 className="size-5 animate-spin" />
              </div>
            ) : !data || data.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">Noch keine Kategorien verfügbar.</p>
            ) : (
              <ul className="space-y-1">
                {data.map((top) => (
                  <TopNode key={top.id} node={top} onNavigate={() => setOpen(false)} />
                ))}
              </ul>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function TopNode({ node, onNavigate }: { node: CategoryTreeNode; onNavigate: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = node.children.length > 0;
  return (
    <li>
      <div className="flex items-stretch gap-1">
        <Link
          to="/$parent"
          params={{ parent: node.slug }}
          onClick={onNavigate}
          className="flex-1 rounded-lg px-3 py-2 text-sm font-semibold text-foreground hover:bg-foreground/5"
        >
          {node.name}
          <span className="ml-2 text-xs font-normal text-muted-foreground">{node.count}</span>
        </Link>
        {hasChildren && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-label={expanded ? "Zuklappen" : "Aufklappen"}
            aria-expanded={expanded}
            className="grid w-9 place-items-center rounded-lg text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
          >
            <ChevronRight className={`size-4 transition-transform ${expanded ? "rotate-90" : ""}`} />
          </button>
        )}
      </div>
      {hasChildren && expanded && (
        <ul className="ml-3 mt-0.5 border-l border-hairline pl-2">
          {node.children.map((c) => (
            <ChildNode key={c.id} parentSlug={node.slug} node={c} onNavigate={onNavigate} />
          ))}
        </ul>
      )}
    </li>
  );
}

function ChildNode({
  parentSlug,
  node,
  onNavigate,
}: {
  parentSlug: string;
  node: CategoryTreeNode;
  onNavigate: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = node.children.length > 0;
  return (
    <li>
      <div className="flex items-stretch gap-1">
        <Link
          to="/$parent/$child"
          params={{ parent: parentSlug, child: node.slug }}
          onClick={onNavigate}
          className="flex-1 rounded-lg px-3 py-1.5 text-sm font-medium text-foreground/85 hover:bg-foreground/5 hover:text-foreground"
        >
          {node.name}
          <span className="ml-2 text-xs font-normal text-muted-foreground">{node.count}</span>
        </Link>
        {hasChildren && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-label={expanded ? "Zuklappen" : "Aufklappen"}
            aria-expanded={expanded}
            className="grid w-9 place-items-center rounded-lg text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
          >
            <ChevronRight className={`size-4 transition-transform ${expanded ? "rotate-90" : ""}`} />
          </button>
        )}
      </div>
      {hasChildren && expanded && (
        <ul className="ml-3 mt-0.5 border-l border-hairline pl-2">
          {node.children.map((c) => (
            <li key={c.id}>
              <Link
                to="/$parent/$child"
                params={{ parent: parentSlug, child: c.slug }}
                onClick={onNavigate}
                className="block rounded-lg px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
              >
                {c.name}
                <span className="ml-2 text-[10px] text-muted-foreground/70">{c.count}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
