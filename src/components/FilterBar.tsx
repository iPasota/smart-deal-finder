import { ChevronDown, Search } from "lucide-react";
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


  return (
    <div className="border-b border-hairline bg-background/92 backdrop-blur-lg">
      <div className="mx-auto max-w-7xl px-4 py-3 lg:px-6">
        {/* Top row: search + sort */}
        <div className="flex items-center gap-2">
          <div className="group relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-foreground/70 transition-colors group-focus-within:text-emerald" />
            <input
              value={filters.search}
              onChange={(e) => onChange({ ...filters, search: e.target.value })}
              placeholder="Suchen — Marke, Modell, ASIN…"
              className="h-12 w-full rounded-xl border-2 border-foreground/15 bg-white pl-11 pr-3 text-sm font-medium text-foreground shadow-sm placeholder:font-normal placeholder:text-muted-foreground focus:border-emerald focus:outline-none focus:ring-4 focus:ring-emerald-soft"
            />
          </div>
          <div className="relative shrink-0">
            <select
              value={filters.sort}
              onChange={(e) => onChange({ ...filters, sort: e.target.value as SortKey })}
              className="h-12 appearance-none rounded-xl border-2 border-foreground bg-foreground pl-4 pr-11 text-sm font-bold text-background focus:outline-none focus:ring-4 focus:ring-foreground/20"
            >
              <option value="discount">Ersparnis</option>
              <option value="newest">Neueste Deals</option>
              <option value="price_asc">Günstigste</option>
              <option value="price_desc">Teuerste</option>
              <option value="shop">Shop</option>
              <option value="condition">Zustand</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 size-5 -translate-y-1/2 text-background" strokeWidth={3} />
          </div>
        </div>


        {/* Category chips – leere Kategorien werden ausgeblendet */}
        <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1 no-scrollbar">
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
        </div>


        {/* Shop chips — komplett ausgeblendet solange nur ein Shop aktiv ist */}
        {SHOP_LIST.filter((s) => s.active).length > 1 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="mr-1 flex items-center gap-1.5 text-xs font-semibold text-foreground/80">
              <span className="inline-block h-3.5 w-1 rounded-full bg-foreground" />
              Shop
            </span>
            {SHOP_LIST.map((s) => {
              const active = filters.shops.includes(s.slug);
              if (!s.active) return null; // "kommt bald" ausblenden bis aktiv
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

          </div>
        )}


        {/* Condition + discount + count */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="mr-1 flex items-center gap-1.5 text-xs font-semibold text-foreground/80">
            <span className="inline-block h-3.5 w-1 rounded-full bg-emerald" />
            Zustand
          </span>
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

          <span className="ml-4 mr-1 flex items-center gap-1.5 text-xs font-semibold text-foreground/80">
            <span className="inline-block h-3.5 w-1 rounded-full bg-amber" />
            Rabatt
          </span>
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


          <span className="font-mono-tabular ml-auto rounded-lg bg-surface-2 px-2.5 py-1 text-xs font-bold text-muted-foreground">
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
