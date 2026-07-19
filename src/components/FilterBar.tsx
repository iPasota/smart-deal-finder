import { ArrowUpDown, Check, SlidersHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CONDITION_LABEL, type Category, type Condition } from "@/lib/mock-deals";
import { SHOP_LIST, type ShopSlug } from "@/lib/shops";
import { MARKETPLACE_LIST, type CountryCode, DEFAULT_COUNTRY } from "@/lib/marketplace";

export type SortKey = "discount" | "newest" | "price_asc" | "price_desc" | "shop" | "condition";

export type Filters = {
  category: Category;
  conditions: Condition[];
  shops: ShopSlug[];
  minDiscount: number;
  maxPrice: number;
  search: string;
  sort: SortKey;
  country: CountryCode;
};

export const DEFAULT_FILTERS: Filters = {
  category: "Alle",
  conditions: [],
  shops: [],
  minDiscount: 0,
  maxPrice: 5000,
  search: "",
  sort: "discount",
  country: DEFAULT_COUNTRY,
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

  const shopsAvailable = SHOP_LIST.filter((s) => s.active).length > 1;

  return (
    <div className="relative z-30 border-b border-hairline bg-background/92 backdrop-blur-lg">
      <div className="mx-auto max-w-7xl px-4 py-2 lg:px-6">
        {/* Compact single-row bar on desktop; collapsible on mobile */}
        <div className="flex items-center gap-2">
          {/* Filter chips (desktop) */}
          <div className="hidden min-w-0 flex-1 items-center gap-x-4 gap-y-1 lg:flex lg:flex-wrap">
            <InlineGroup label="Zustand" accent="bg-emerald">
              {(Object.keys(CONDITION_LABEL) as Condition[]).map((c) => {
                const active = filters.conditions.includes(c);
                if (!active && condCount(c) === 0) return null;
                return (
                  <Chip key={c} active={active} tone="emerald" onClick={() => toggleCondition(c)}>
                    {CONDITION_LABEL[c]}
                  </Chip>
                );
              })}
            </InlineGroup>

            <InlineGroup label="Rabatt" accent="bg-amber">
              {[0, 10, 20, 30, 40].map((d) => {
                const active = filters.minDiscount === d;
                if (!active && d !== 0 && discCount(d) === 0) return null;
                return (
                  <Chip
                    key={d}
                    active={active}
                    tone="amber"
                    onClick={() => onChange({ ...filters, minDiscount: d })}
                  >
                    {d === 0 ? "Alle" : `${d}%+`}
                  </Chip>
                );
              })}
            </InlineGroup>

            {shopsAvailable && (
              <InlineGroup label="Shop" accent="bg-foreground">
                {SHOP_LIST.map((s) => {
                  if (!s.active) return null;
                  const active = filters.shops.includes(s.slug);
                  if (!active && shopCount(s.slug) === 0) return null;
                  return (
                    <button
                      key={s.slug}
                      type="button"
                      onClick={() => toggleShop(s.slug)}
                      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-bold uppercase tracking-tight transition-all ${
                        active
                          ? "border-foreground bg-foreground text-background"
                          : "border-hairline bg-surface text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                      }`}
                    >
                      <span className="inline-block size-1.5 rounded-full" style={{ backgroundColor: s.color }} aria-hidden />
                      {s.shortName}
                    </button>
                  );
                })}
              </InlineGroup>
            )}
          </div>

          {/* Mobile: filter toggle */}
          <button
            type="button"
            onClick={() => setFiltersOpen((v) => !v)}
            aria-label="Filter"
            aria-expanded={filtersOpen}
            className="relative inline-flex items-center gap-1.5 rounded-lg border border-foreground/15 bg-white px-3 py-1.5 text-sm font-semibold text-foreground transition-colors hover:border-foreground/40 lg:hidden"
          >
            <SlidersHorizontal className="size-4" strokeWidth={2.5} />
            Filter
            {activeFilterCount > 0 && (
              <span className="ml-1 grid size-4 place-items-center rounded-full bg-emerald text-[10px] font-black text-emerald-foreground">
                {activeFilterCount}
              </span>
            )}
          </button>

          <span className="font-mono-tabular ml-auto hidden shrink-0 rounded-md bg-surface-2 px-2 py-0.5 text-[11px] font-bold text-muted-foreground sm:inline">
            {count} Deals
          </span>

          {/* Sort */}
          <div ref={sortRef} className="relative shrink-0">
            <button
              type="button"
              onClick={() => setSortOpen((v) => !v)}
              aria-label="Sortierung"
              title={`Sortieren: ${SORT_OPTIONS.find((o) => o.value === filters.sort)?.label ?? ""}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-foreground bg-foreground px-2.5 py-1.5 text-xs font-bold text-background transition-colors hover:bg-foreground/90"
            >
              <ArrowUpDown className="size-4" strokeWidth={2.5} />
              <span className="hidden sm:inline">
                {SORT_OPTIONS.find((o) => o.value === filters.sort)?.label}
              </span>
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
        </div>

        {/* Mobile-only expanded filters */}
        {filtersOpen && (
          <div className="mt-2 space-y-2 lg:hidden">
            <MobileGroup label="Zustand" accent="bg-emerald">
              {(Object.keys(CONDITION_LABEL) as Condition[]).map((c) => {
                const active = filters.conditions.includes(c);
                if (!active && condCount(c) === 0) return null;
                return (
                  <Chip key={c} active={active} tone="emerald" onClick={() => toggleCondition(c)}>
                    {CONDITION_LABEL[c]}
                  </Chip>
                );
              })}
            </MobileGroup>
            <MobileGroup label="Rabatt" accent="bg-amber">
              {[0, 10, 20, 30, 40].map((d) => {
                const active = filters.minDiscount === d;
                if (!active && d !== 0 && discCount(d) === 0) return null;
                return (
                  <Chip
                    key={d}
                    active={active}
                    tone="amber"
                    onClick={() => onChange({ ...filters, minDiscount: d })}
                  >
                    {d === 0 ? "Alle" : `${d}%+`}
                  </Chip>
                );
              })}
            </MobileGroup>
            {shopsAvailable && (
              <MobileGroup label="Shop" accent="bg-foreground">
                {SHOP_LIST.map((s) => {
                  if (!s.active) return null;
                  const active = filters.shops.includes(s.slug);
                  if (!active && shopCount(s.slug) === 0) return null;
                  return (
                    <button
                      key={s.slug}
                      type="button"
                      onClick={() => toggleShop(s.slug)}
                      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-bold uppercase tracking-tight transition-all ${
                        active
                          ? "border-foreground bg-foreground text-background"
                          : "border-hairline bg-surface text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                      }`}
                    >
                      <span className="inline-block size-1.5 rounded-full" style={{ backgroundColor: s.color }} aria-hidden />
                      {s.shortName}
                    </button>
                  );
                })}
              </MobileGroup>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function InlineGroup({ label, accent, children }: { label: string; accent: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="flex shrink-0 items-center gap-1 text-[11px] font-semibold text-foreground/70">
        <span className={`inline-block h-3 w-1 rounded-full ${accent}`} />
        {label}
      </span>
      <div className="flex flex-wrap gap-1">{children}</div>
    </div>
  );
}

function MobileGroup({ label, accent, children }: { label: string; accent: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-1 flex shrink-0 items-center gap-1 text-[11px] font-semibold text-foreground/70">
        <span className={`inline-block h-3 w-1 rounded-full ${accent}`} />
        {label}
      </span>
      <div className="flex flex-wrap gap-1">{children}</div>
    </div>
  );
}

function Chip({
  children,
  active,
  onClick,
  tone = "emerald",
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  tone?: "emerald" | "amber";
}) {
  const activeCls =
    tone === "amber"
      ? "border-amber bg-amber text-amber-foreground"
      : "border-emerald bg-emerald text-emerald-foreground";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-bold uppercase tracking-tight transition-all ${
        active
          ? activeCls
          : "border-hairline bg-surface text-muted-foreground hover:border-foreground/40 hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
