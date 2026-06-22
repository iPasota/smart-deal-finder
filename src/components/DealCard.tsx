import { useState } from "react";
import { Bell, LineChart, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";

import { buildDeeplink, trackClick } from "@/lib/affiliate";
import { discountPct, formatEUR, type Deal } from "@/lib/mock-deals";
import { ConditionBadge } from "./ConditionBadge";
import { DiscountBadge } from "./DiscountBadge";
import { PriceSparkline } from "./PriceSparkline";
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
      <motion.a
        href={href}
        target="_blank"
        rel="noopener sponsored"
        onClick={handleClick}
        whileHover={{ y: -2 }}
        transition={{ type: "spring", stiffness: 280, damping: 24 }}
        className="group relative flex flex-col overflow-hidden rounded-xl border border-hairline bg-surface transition-colors hover:border-emerald/40 hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald"
      >
        {/* Secondary actions — sit on top of the card link */}
        <div className="absolute right-2 top-2 z-10 flex gap-1">
          <IconButton
            label="Preisverlauf"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setHistoryOpen(true);
            }}
          >
            <LineChart className="size-3.5" />
          </IconButton>
          <IconButton
            label="Preiswecker"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setAlertOpen(true);
            }}
          >
            <Bell className="size-3.5" />
          </IconButton>
        </div>

        {/* Image */}
        <div className="relative aspect-square w-full overflow-hidden bg-zinc-950">
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
          <div className="pointer-events-none absolute inset-0 hidden items-center justify-center text-[10px] uppercase tracking-[0.2em] text-zinc-600 [.img-fallback_&]:flex">
            {deal.brand}
          </div>
          {!deal.inStock && (
            <div className="absolute inset-x-0 bottom-0 bg-zinc-950/80 py-1 text-center text-[11px] uppercase tracking-wider text-zinc-400">
              Aktuell vergriffen
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex flex-1 flex-col gap-3 p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {deal.brand}
            </span>
            <ConditionBadge condition={deal.condition} />
          </div>

          <h3 className="line-clamp-2 min-h-[2.5rem] text-sm leading-snug text-foreground">
            {deal.title}
          </h3>

          <div className="mt-auto flex items-end justify-between gap-3 pt-2">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="font-mono-tabular text-xl font-semibold tracking-tight text-foreground">
                  {formatEUR(deal.priceCents)}
                </span>
                <DiscountBadge pct={pct} />
              </div>
              <div className="font-mono-tabular mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className="line-through">{formatEUR(deal.newPriceCents)}</span>
                <span>·</span>
                <span className="text-emerald/90">−{formatEUR(savings)}</span>
              </div>
            </div>
            <PriceSparkline data={deal.history.map((h) => h.p)} />
          </div>

          <div className="flex items-center justify-between border-t border-hairline pt-3 text-[11px]">
            <span className="text-muted-foreground">Zu Amazon Warehouse</span>
            <ExternalLink className="size-3.5 text-emerald transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>
      </motion.a>

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
  onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="grid size-7 place-items-center rounded-md border border-hairline bg-zinc-900/70 text-zinc-300 backdrop-blur transition-colors hover:border-emerald/40 hover:bg-zinc-900 hover:text-emerald"
    >
      {children}
    </button>
  );
}
