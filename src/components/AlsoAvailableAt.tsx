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
    <div className="-mt-1 flex flex-wrap items-center gap-x-1 gap-y-1 text-[11px] text-muted-foreground">
      <span className="font-semibold uppercase tracking-wider text-foreground/60">Auch bei:</span>
      {top.map((o, i) => {
        const shop = SHOPS[o.shop];
        return (
          <span key={o.shop} className="flex items-center gap-1">
            <a
              href={shop.buildDeeplink(o.externalId)}
              target="_blank"
              rel={shop.linkRel}
              onClick={() => trackClick(`${dealId}:${o.shop}`)}
              className="inline-flex items-center gap-1 rounded-md border border-hairline bg-surface px-1.5 py-0.5 font-semibold text-foreground/80 transition-colors hover:border-emerald/40 hover:text-emerald-ink"
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
            {i < top.length - 1 && <span aria-hidden className="text-foreground/30">·</span>}
          </span>
        );
      })}
    </div>
  );
}
