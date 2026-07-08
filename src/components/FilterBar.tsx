import { ArrowUpDown, Check, SlidersHorizontal, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CATEGORIES, CONDITION_LABEL, type Category, type Condition } from "@/lib/mock-deals";
import { SHOP_LIST, type ShopSlug } from "@/lib/shops";

export type SortKey = "discount" | "newest" | "price_asc" | "price_desc" | "shop" | "condition";

export type Filters = {
  category: Category;
  conditions: Condition[];
  shops: ShopSlug[];
  minDiscount: number;
  maxPrice: number;
  search: string;
  sort: SortKey;
};

export const DEFAULT_FILTERS: Filters = {
  category: "Alle",
  conditions: [],
  shops: [],
  minDiscount: 0,
  maxPrice: 5000,
  search: "",
  sort: "discount",
};

export type FilterAvailability = {
  categories: Record<string, number>;
  conditions: Record<string, number>;
  shops: Record<string, number>;
  discounts: Record<number, number>;
};

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "discount", label: "Ersparnis" },
  { value: "newest", label: "Neueste Deals" },
  { value: "price_asc", label: "Günstigste" },
  { value: "price_desc", label: "Teuerste" },
  { value: "shop", label: "Shop" },
  { value: "condition", label: "Zustand" },
];

export function FilterBar({
  filters,
  onChange,
  count,
  availability,
}: {
  filters: Filters;
  onChange: (next: Filters) => void;
  count: number;
  availability?: FilterAvailability;
}) {
  const catCount = (c: string) => (availability ? availability.categories[c] ?? 0 : Infinity);
  const condCount = (c: Condition) => (availability ? availability.conditions[c] ?? 0 : Infinity);
  const shopCount = (s: ShopSlug) => (availability ? availability.shops[s] ?? 0 : Infinity);
  const discCount = (d: number) => (availability ? availability.discounts[d] ?? 0 : Infinity);

  const [sortOpen, setSortOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sortOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [sortOpen]);

  const toggleCondition = (c: Condition) => {
    const next = filters.conditions.includes(c)
      ? filters.conditions.filter((x) => x !== c)
      : [...filters.conditions, c];
    onChange({ ...filters, conditions: next });
  };

  const toggleShop = (s: ShopSlug) => {
    const next = filters.shops.includes(s)
      ? filters.shops.filter((x) => x !== s)
      : [...filters.shops, s];
    onChange({ ...filters, shops: next });
  };

  const activeFilterCount =
    filters.conditions.length +
    filters.shops.length +
    (filters.minDiscount > 0 ? 1 : 0);

  return (
    <div className="relative z-30 border-b border-hairline bg-background/92 backdrop-blur-lg">
      <div className="mx-auto max-w-7xl px-4 py-3 lg:px-6">
        {/* Top row: search + sort icon + (mobile) filter toggle */}
        <div className="flex items-center gap-2">
          <div className="group relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-foreground/70 transition-colors group-focus-within:text-emerald" />
            <input
              value={filters.search}
              onChange={(e) => onChange({ ...filters, search: e.target.value })}
              placeholder="Marke, Modell, ASIN…"
              className="h-12 w-full rounded-xl border-2 border-foreground/15 bg-white pl-10 pr-3 text-sm font-medium text-foreground shadow-sm placeholder:font-normal placeholder:text-muted-foreground focus:border-emerald focus:outline-none focus:ring-4 focus:ring-emerald-soft"
            />
          </div>

          {/* Sort as icon button */}
          <div ref={sortRef} className="relative shrink-0">
            <button
              type="button"
              onClick={() => setSortOpen((v) => !v)}
              aria-label="Sortierung"
              title={`Sortieren: ${SORT_OPTIONS.find((o) => o.value === filters.sort)?.label ?? ""}`}
              className="grid size-12 place-items-center rounded-xl border-2 border-foreground bg-foreground text-background transition-colors hover:bg-foreground/90 focus:outline-none focus:ring-4 focus:ring-foreground/20"
            >
              <ArrowUpDown className="size-5" strokeWidth={2.5} />
            </button>
            {sortOpen && (
              <div className="absolute right-0 z-30 mt-2 w-52 overflow-hidden rounded-xl border border-hairline bg-white shadow-lg">
                {SORT_OPTIONS.map((o) => {
                  const active = filters.sort === o.value;
                  return (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => {
                        onChange({ ...filters, sort: o.value });
                        setSortOpen(false);
                      }}
                      className={`flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left text-sm font-semibold transition-colors ${
                        active ? "bg-foreground/5 text-foreground" : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
                      }`}
                    >
                      {o.label}
                      {active && <Check className="size-4 text-emerald" strokeWidth={3} />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Mobile filter toggle */}
          <button
            type="button"
            onClick={() => setFiltersOpen((v) => !v)}
            aria-label="Filter"
            aria-expanded={filtersOpen}
            className="relative grid size-12 shrink-0 place-items-center rounded-xl border-2 border-foreground/15 bg-white text-foreground transition-colors hover:border-foreground/40 focus:outline-none focus:ring-4 focus:ring-foreground/10 lg:hidden"
          >
            <SlidersHorizontal className="size-5" strokeWidth={2.5} />
            {activeFilterCount > 0 && (
              <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-emerald text-[10px] font-black text-emerald-foreground">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Collapsible on mobile, always visible on lg+ */}
        <div className={`${filtersOpen ? "block" : "hidden"} lg:block`}>
          {/* Category chips */}
          <FadeRow className="mt-3">
            {CATEGORIES.map((c) => {
              const active = filters.category === c;
              if (!active && catCount(c) === 0) return null;
              return (
                <Chip
                  key={c}
                  active={active}
                  tone="emerald"
                  onClick={() => onChange({ ...filters, category: c })}
                >
                  {c}
                </Chip>
              );
            })}
          </FadeRow>

          {/* Shop chips — komplett ausgeblendet solange nur ein Shop aktiv ist */}
          {SHOP_LIST.filter((s) => s.active).length > 1 && (
            <FilterRow label="Shop" accent="bg-foreground">
              {SHOP_LIST.map((s) => {
                const active = filters.shops.includes(s.slug);
                if (!s.active) return null;
                if (!active && shopCount(s.slug) === 0) return null;
                return (
                  <button
                    key={s.slug}
                    type="button"
                    onClick={() => toggleShop(s.slug)}
                    className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border px-2.5 py-1 text-[11px] font-bold uppercase tracking-tight transition-all ${
                      active
                        ? "border-foreground bg-foreground text-background shadow-sm"
                        : "border-hairline bg-surface text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                    }`}
                  >
                    <span className="inline-block size-1.5 rounded-full" style={{ backgroundColor: s.color }} aria-hidden />
                    {s.shortName}
                  </button>
                );
              })}
            </FilterRow>
          )}

          {/* Zustand — eigene Zeile */}
          <FilterRow label="Zustand" accent="bg-emerald">
            {(Object.keys(CONDITION_LABEL) as Condition[]).map((c) => {
              const active = filters.conditions.includes(c);
              if (!active && condCount(c) === 0) return null;
              return (
                <Chip
                  key={c}
                  active={active}
                  tone="emerald"
                  size="sm"
                  onClick={() => toggleCondition(c)}
                >
                  {CONDITION_LABEL[c]}
                </Chip>
              );
            })}
          </FilterRow>

          {/* Rabatt — eigene Zeile */}
          <FilterRow label="Rabatt" accent="bg-amber">
            {[0, 10, 20, 30, 40].map((d) => {
              const active = filters.minDiscount === d;
              if (!active && d !== 0 && discCount(d) === 0) return null;
              return (
                <Chip
                  key={d}
                  active={active}
                  tone="amber"
                  size="sm"
                  onClick={() => onChange({ ...filters, minDiscount: d })}
                >
                  {d === 0 ? "Alle" : `${d}%+`}
                </Chip>
              );
            })}
          </FilterRow>

          <div className="mt-3 flex justify-end">
            <span className="font-mono-tabular rounded-lg bg-surface-2 px-2.5 py-1 text-xs font-bold text-muted-foreground">
              {count} Deals
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function FilterRow({
  label,
  accent,
  children,
}: {
  label: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-3 flex items-center gap-2">
      <span className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-foreground/80">
        <span className={`inline-block h-3.5 w-1 rounded-full ${accent}`} />
        {label}
      </span>
      <FadeRow className="min-w-0 flex-1">{children}</FadeRow>
    </div>
  );
}

function FadeRow({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 no-scrollbar ${className}`}
      style={{
        maskImage:
          "linear-gradient(to right, black 0, black calc(100% - 24px), transparent 100%)",
        WebkitMaskImage:
          "linear-gradient(to right, black 0, black calc(100% - 24px), transparent 100%)",
      }}
    >
      {children}
    </div>
  );
}

function Chip({
  children,
  active,
  onClick,
  tone = "emerald",
  size = "md",
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  tone?: "emerald" | "amber";
  size?: "sm" | "md";
}) {
  const sizing = size === "sm" ? "px-2.5 py-1 text-[11px]" : "px-3.5 py-1.5 text-xs";
  const activeCls =
    tone === "amber"
      ? "border-amber bg-amber text-amber-foreground shadow-sm"
      : "border-emerald bg-emerald text-emerald-foreground shadow-sm";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`whitespace-nowrap rounded-lg border font-bold uppercase tracking-tight transition-all ${sizing} ${
        active
          ? activeCls
          : "border-hairline bg-surface text-muted-foreground hover:border-foreground/40 hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
