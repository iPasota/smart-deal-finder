import { useState } from "react";
import { Bell, LineChart, ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";

import { buildDeeplink, trackClick } from "@/lib/affiliate";
import { discountPct, formatEUR, type Deal } from "@/lib/mock-deals";
import { ConditionBadge } from "./ConditionBadge";
import { DiscountBadge } from "./DiscountBadge";
import { PriceHistoryModal } from "./PriceHistoryModal";
import { PriceAlertModal } from "./PriceAlertModal";

export function DealCard({ deal }: { deal: Deal }) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);

  const href = buildDeeplink(deal.asin);
  const pct = discountPct(deal);
  const savings = deal.newPriceCents - deal.priceCents;

  const handleClick = () => trackClick(deal.id);

  return (
    <>
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ type: "spring", stiffness: 280, damping: 24 }}
        className="group relative flex flex-col overflow-hidden rounded-xl border border-hairline bg-surface shadow-sm transition-colors hover:border-emerald/50"
      >
        {/* Secondary actions */}
        <div className="absolute right-2 top-2 z-10 flex gap-1">
          <IconButton label="Preisverlauf" onClick={() => setHistoryOpen(true)}>
            <LineChart className="size-3.5" />
          </IconButton>
          <IconButton label="Preiswecker" onClick={() => setAlertOpen(true)}>
            <Bell className="size-3.5" />
          </IconButton>
        </div>

        {/* Image — linked */}
        <a
          href={href}
          target="_blank"
          rel="noopener sponsored"
          onClick={handleClick}
          aria-label={deal.title}
          className="relative block aspect-square w-full overflow-hidden bg-surface-2"
        >
          <img
            src={deal.imageUrl}
            alt={deal.title}
            loading="lazy"
            onError={(e) => {
              const t = e.currentTarget;
              t.style.display = "none";
              t.parentElement?.classList.add("img-fallback");
            }}
            className="size-full object-contain p-6 transition-transform duration-500 group-hover:scale-[1.03]"
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
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {deal.brand}
            </span>
            <ConditionBadge condition={deal.condition} />
          </div>

          <a
            href={href}
            target="_blank"
            rel="noopener sponsored"
            onClick={handleClick}
            className="line-clamp-2 min-h-[2.5rem] text-sm leading-snug text-foreground hover:text-emerald"
          >
            {deal.title}
          </a>

          <div className="mt-auto pt-1">
            <div className="flex items-baseline gap-2">
              <span className="font-mono-tabular text-2xl font-semibold tracking-tight text-foreground">
                {formatEUR(deal.priceCents)}
              </span>
              <DiscountBadge pct={pct} />
            </div>
            <div className="font-mono-tabular mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="line-through">{formatEUR(deal.newPriceCents)}</span>
              <span>·</span>
              <span className="text-emerald">du sparst {formatEUR(savings)}</span>
            </div>
          </div>

          {/* Primary CTA */}
          <a
            href={href}
            target="_blank"
            rel="noopener sponsored"
            onClick={handleClick}
            className="mt-2 inline-flex items-center justify-center gap-2 rounded-lg bg-emerald px-4 py-2.5 text-sm font-semibold text-emerald-foreground shadow-sm transition-all hover:brightness-110 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            Bei Amazon ansehen
            <ArrowUpRight className="size-4" />
          </a>

          <button
            type="button"
            onClick={() => setHistoryOpen(true)}
            className="-mb-1 inline-flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground"
          >
            <LineChart className="size-3" />
            Preisverlauf ansehen
          </button>
        </div>
      </motion.div>

      <PriceHistoryModal deal={deal} open={historyOpen} onOpenChange={setHistoryOpen} />
      <PriceAlertModal deal={deal} open={alertOpen} onOpenChange={setAlertOpen} />
    </>
  );
}

function IconButton({
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
      className="grid size-7 place-items-center rounded-md border border-hairline bg-surface/90 text-muted-foreground backdrop-blur transition-colors hover:border-emerald/50 hover:bg-surface hover:text-emerald"
    >
      {children}
    </button>
  );
}
