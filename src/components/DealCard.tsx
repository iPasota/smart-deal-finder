import { useState } from "react";
import { Bell, LineChart, ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";

import { trackClick } from "@/lib/affiliate";
import { discountPct, formatEUR, type Deal } from "@/lib/mock-deals";
import { SHOPS } from "@/lib/shops";
import { ConditionBadge } from "./ConditionBadge";
import { ShopBadge } from "./ShopBadge";
import { AlsoAvailableAt } from "./AlsoAvailableAt";
import { PriceHistoryModal } from "./PriceHistoryModal";
import { PriceAlertModal } from "./PriceAlertModal";

export function DealCard({ deal }: { deal: Deal }) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);

  const shop = SHOPS[deal.shop];
  const href = shop.buildDeeplink(deal.asin);
  const pct = discountPct(deal);
  const savings = deal.newPriceCents - deal.priceCents;

  const handleClick = () => trackClick(deal.id);

  return (
    <>
      <motion.article
        whileHover={{ y: -2 }}
        transition={{ type: "spring", stiffness: 280, damping: 24 }}
        className="group relative flex flex-col overflow-hidden rounded-2xl border border-hairline bg-surface shadow-sm transition-colors hover:border-emerald/40"
      >
        {/* Image */}
        <a
          href={href}
          target="_blank"
          rel={shop.linkRel}
          onClick={handleClick}
          aria-label={deal.title}
          className="relative block aspect-square w-full overflow-hidden bg-white p-6"
        >
          {/* Shop badge — top left, indicates source */}
          <div className="absolute left-3 top-3 z-10">
            <ShopBadge shop={deal.shop} />
          </div>

          <img
            src={deal.imageUrl}
            alt={deal.title}
            loading="lazy"
            onError={(e) => {
              const t = e.currentTarget;
              t.style.display = "none";
              t.parentElement?.classList.add("img-fallback");
            }}
            className="size-full object-contain transition-transform duration-500 group-hover:scale-[1.03]"
          />
          <div className="pointer-events-none absolute inset-0 hidden items-center justify-center text-[10px] uppercase tracking-[0.2em] text-muted-foreground [.img-fallback_&]:flex">
            {deal.brand}
          </div>

          {!deal.inStock && (
            <div className="absolute inset-x-0 bottom-0 bg-foreground/85 py-1 text-center text-[11px] uppercase tracking-wider text-background">
              Aktuell vergriffen
            </div>
          )}
        </a>

        {/* Body */}
        <div className="flex flex-1 flex-col gap-3 p-4">
          <div className="flex items-center justify-between gap-2">
            <ConditionBadge condition={deal.condition} />
            {pct > 0 && (
              <span className="font-mono-tabular inline-flex items-center rounded-md border border-amber/40 bg-amber px-2 py-0.5 text-xs font-bold text-amber-foreground">
                −{pct}%
              </span>
            )}
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              {deal.brand}
            </span>
            <span className="size-1.5 rounded-full bg-emerald" aria-hidden />
          </div>

          <a
            href={href}
            target="_blank"
            rel="noopener sponsored"
            onClick={handleClick}
            className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-snug text-foreground hover:text-emerald-ink"
          >
            {deal.title}
          </a>

          {/* Price block with amber left border accent */}
          <div className="mt-auto flex items-center gap-3 rounded-xl border border-hairline bg-surface-2/60 p-3 pl-3.5 [border-left:3px_solid_var(--amber)]">
            <div className="flex flex-col">
              <span className="font-mono-tabular text-[10px] text-muted-foreground line-through">
                {formatEUR(deal.newPriceCents)}
              </span>
              <span className="font-mono-tabular text-xl font-extrabold leading-none tracking-tight text-foreground">
                {formatEUR(deal.priceCents)}
              </span>
            </div>
            <div className="h-8 w-px bg-hairline" />
            <div className="flex flex-col">
              <span className="text-[9px] font-bold uppercase tracking-wider text-amber-ink">
                Ersparnis
              </span>
              <span className="font-mono-tabular text-sm font-bold text-amber-ink">
                −{formatEUR(savings)}
              </span>
            </div>
          </div>

          {/* CTA row: primary Amazon + 2 icon actions */}
          <div className="flex gap-2">
            <a
              href={href}
              target="_blank"
              rel="noopener sponsored"
              onClick={handleClick}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald px-4 py-3 text-xs font-extrabold uppercase tracking-wider text-emerald-foreground shadow-sm shadow-emerald/20 transition-all hover:brightness-110 hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            >
              Bei Amazon
              <ArrowUpRight className="size-4" strokeWidth={2.5} />
            </a>
            <IconAction label="Preisverlauf" onClick={() => setHistoryOpen(true)}>
              <LineChart className="size-4" strokeWidth={2.25} />
            </IconAction>
            <IconAction label="Preiswecker" onClick={() => setAlertOpen(true)}>
              <Bell className="size-4" strokeWidth={2.25} />
            </IconAction>
          </div>
        </div>
      </motion.article>

      <PriceHistoryModal deal={deal} open={historyOpen} onOpenChange={setHistoryOpen} />
      <PriceAlertModal deal={deal} open={alertOpen} onOpenChange={setAlertOpen} />
    </>
  );
}

function IconAction({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="grid size-11 shrink-0 place-items-center rounded-xl border-2 border-hairline bg-surface text-muted-foreground transition-colors hover:border-amber hover:bg-amber-soft hover:text-amber-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber"
    >
      {children}
    </button>
  );
}
