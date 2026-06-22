import { Search } from "lucide-react";
import { CATEGORIES, CONDITION_LABEL, type Category, type Condition } from "@/lib/mock-deals";

export type SortKey = "discount" | "newest" | "price_asc" | "price_desc";

export type Filters = {
  category: Category;
  conditions: Condition[];
  minDiscount: number;
  maxPrice: number;
  search: string;
  sort: SortKey;
};

export const DEFAULT_FILTERS: Filters = {
  category: "Alle",
  conditions: [],
  minDiscount: 0,
  maxPrice: 5000,
  search: "",
  sort: "discount",
};

export function FilterBar({
  filters,
  onChange,
  count,
}: {
  filters: Filters;
  onChange: (next: Filters) => void;
  count: number;
}) {
  const toggleCondition = (c: Condition) => {
    const next = filters.conditions.includes(c)
      ? filters.conditions.filter((x) => x !== c)
      : [...filters.conditions, c];
    onChange({ ...filters, conditions: next });
  };

  return (
    <div className="sticky top-0 z-30 border-b border-hairline bg-background/85 backdrop-blur-lg">
      <div className="mx-auto max-w-7xl px-4 py-3 lg:px-6">
        {/* Top row: search + sort + count */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={filters.search}
              onChange={(e) => onChange({ ...filters, search: e.target.value })}
              placeholder="Suchen — Marke, Modell, ASIN…"
              className="h-10 w-full rounded-lg border border-hairline bg-surface pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-emerald/40 focus:outline-none focus:ring-1 focus:ring-emerald/40"
            />
          </div>
          <select
            value={filters.sort}
            onChange={(e) => onChange({ ...filters, sort: e.target.value as SortKey })}
            className="h-10 rounded-lg border border-hairline bg-surface px-3 text-sm text-foreground focus:border-emerald/40 focus:outline-none focus:ring-1 focus:ring-emerald/40"
          >
            <option value="discount">Größter Rabatt</option>
            <option value="newest">Neueste Deals</option>
            <option value="price_asc">Preis aufsteigend</option>
            <option value="price_desc">Preis absteigend</option>
          </select>
        </div>

        {/* Chips row */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            Kategorie
          </span>
          {CATEGORIES.map((c) => (
            <Chip
              key={c}
              active={filters.category === c}
              onClick={() => onChange({ ...filters, category: c })}
            >
              {c}
            </Chip>
          ))}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            Zustand
          </span>
          {(Object.keys(CONDITION_LABEL) as Condition[]).map((c) => (
            <Chip
              key={c}
              active={filters.conditions.includes(c)}
              onClick={() => toggleCondition(c)}
            >
              {CONDITION_LABEL[c]}
            </Chip>
          ))}

          <span className="ml-3 mr-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            Min. Rabatt
          </span>
          {[0, 10, 20, 30, 40].map((d) => (
            <Chip
              key={d}
              active={filters.minDiscount === d}
              onClick={() => onChange({ ...filters, minDiscount: d })}
            >
              {d === 0 ? "Alle" : `${d}%+`}
            </Chip>
          ))}

          <span className="font-mono-tabular ml-auto text-[11px] text-muted-foreground">
            {count} Deals
          </span>
        </div>
      </div>
    </div>
  );
}

function Chip({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
        active
          ? "border-emerald bg-emerald text-emerald-foreground"
          : "border-hairline bg-surface text-muted-foreground hover:border-emerald/40 hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
