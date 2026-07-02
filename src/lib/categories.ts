// Shared category helpers (browser + server safe).

export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/ß/g, "ss")
    .replace(/&/g, " und ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export type CategoryRow = {
  id: string;
  parent_id: string | null;
  slug: string;
  name: string;
  keepa_category_id: number | null;
  seo_title: string | null;
  seo_description: string | null;
  intro_md: string | null;
  outro_md: string | null;
  sort: number;
};

export type CategoryNode = CategoryRow & { children: CategoryNode[] };

export function buildTree(rows: CategoryRow[]): CategoryNode[] {
  const byId = new Map<string, CategoryNode>();
  rows.forEach((r) => byId.set(r.id, { ...r, children: [] }));
  const roots: CategoryNode[] = [];
  byId.forEach((node) => {
    if (node.parent_id && byId.has(node.parent_id)) {
      byId.get(node.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  const sortFn = (a: CategoryNode, b: CategoryNode) =>
    a.sort - b.sort || a.name.localeCompare(b.name, "de");
  roots.sort(sortFn);
  roots.forEach((r) => r.children.sort(sortFn));
  return roots;
}
