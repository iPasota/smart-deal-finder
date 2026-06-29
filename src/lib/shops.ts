// Shop registry. Each shop knows how to render and how to build a deeplink.
// New shops are added by extending SHOPS — UI and filters pick them up automatically.

export type ShopSlug = "amazon-warehouse" | "backmarket" | "rebuy" | "refurbed";

export type Shop = {
  slug: ShopSlug;
  name: string;
  shortName: string;
  color: string;          // brand-ish accent (used for badges)
  linkRel: string;
  active: boolean;        // false = nicht im MVP, Chip disabled
  // Build a deeplink for a given external_id + affiliate tag (tag may be empty).
  buildDeeplink: (externalId: string, tag?: string) => string;
};

export const SHOPS: Record<ShopSlug, Shop> = {
  "amazon-warehouse": {
    slug: "amazon-warehouse",
    name: "Amazon Warehouse",
    shortName: "Amazon",
    color: "#FF9900",
    linkRel: "sponsored nofollow noopener",
    active: true,
    buildDeeplink: (asin, tag = "whdfinder-21") => {
      const p = new URLSearchParams({ tag, linkCode: "ll1", psc: "1", th: "1" });
      return `https://www.amazon.de/dp/${asin}?${p.toString()}`;
    },
  },
  backmarket: {
    slug: "backmarket",
    name: "Back Market",
    shortName: "Back Market",
    color: "#7ED957",
    linkRel: "sponsored nofollow noopener",
    active: false,
    buildDeeplink: (id) => `https://www.backmarket.de/p/${id}`,
  },
  rebuy: {
    slug: "rebuy",
    name: "reBuy",
    shortName: "reBuy",
    color: "#FF6B00",
    linkRel: "sponsored nofollow noopener",
    active: false,
    buildDeeplink: (id) => `https://www.rebuy.de/i,${id}.html`,
  },
  refurbed: {
    slug: "refurbed",
    name: "refurbed",
    shortName: "refurbed",
    color: "#00C896",
    linkRel: "sponsored nofollow noopener",
    active: false,
    buildDeeplink: (id) => `https://www.refurbed.de/p/${id}`,
  },
};

export const SHOP_LIST: Shop[] = Object.values(SHOPS);
