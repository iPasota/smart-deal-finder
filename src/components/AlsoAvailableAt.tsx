import { SHOPS, type ShopSlug } from "@/lib/shops";
import { formatPrice } from "@/lib/marketplace";
import { trackClick } from "@/lib/affiliate";

export type AlternativeOffer = {
  shop: ShopSlug;
  externalId: string;
  priceCents: number;
  currency: "EUR" | "GBP";
};

export function AlsoAvailableAt({
  offers,
  dealId,
}: {
  offers: AlternativeOffer[];
  dealId: string;
}) {
  if (!offers || offers.length === 0) return null;
  const top = [...offers].sort((a, b) => a.priceCents - b.priceCents).slice(0, 3);

  return (
    <div className="-mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
      <span className="shrink-0 font-semibold uppercase tracking-wider text-foreground/60">Auch zu:</span>
      <div className="relative min-w-0 flex-1">
        <div className="flex items-center gap-1 overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {top.map((o) => {
            const shop = SHOPS[o.shop];
            return (
              <a
                key={o.shop}
                href={shop.buildDeeplink(o.externalId)}
                target="_blank"
                rel={shop.linkRel}
                onClick={() => trackClick(`${dealId}:${o.shop}`)}
                className="inline-flex shrink-0 items-center gap-1 rounded-md border border-hairline bg-surface px-1.5 py-0.5 font-semibold text-foreground/80 transition-colors hover:border-emerald/40 hover:text-emerald-ink"
              >
                <span
                  className="inline-block size-1.5 rounded-full"
                  style={{ backgroundColor: shop.color }}
                  aria-hidden
                />
                <span>{shop.shortName}</span>
                <span className="font-mono-tabular font-bold">
                  {formatPrice(o.priceCents, o.currency)}
                </span>
              </a>
            );
          })}
        </div>
        <div className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-surface to-transparent" aria-hidden />
      </div>
    </div>
  );
}
