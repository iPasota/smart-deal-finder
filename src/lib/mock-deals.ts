import type { ShopSlug } from "@/lib/shops";
import type { AlternativeOffer } from "@/components/AlsoAvailableAt";

export type Condition = "like_new" | "very_good" | "good" | "acceptable";

export type Deal = {
  id: string;
  asin: string;
  title: string;
  brand: string;
  category: string;
  imageUrl: string;
  condition: Condition;
  priceCents: number;
  newPriceCents: number;
  msrpCents: number;
  currency: "EUR";
  inStock: boolean;
  firstSeenAt: string;
  shop: ShopSlug;
  countryCode: "DE";
  alternatives: AlternativeOffer[];
  // Last 90 days of warehouse prices, oldest first.
  history: { t: string; p: number }[];
};

export const CONDITION_LABEL: Record<Condition, string> = {
  like_new: "Wie neu",
  very_good: "Sehr gut",
  good: "Gut",
  acceptable: "Akzeptabel",
};

export const CATEGORIES = [
  "Alle",
  "Kopfhörer",
  "Smartphones",
  "Laptops",
  "Monitore",
  "Kameras",
  "TV & Audio",
  "Konsolen",
  "Smart Home",
] as const;

export type Category = (typeof CATEGORIES)[number];

function genHistory(seed: number, end: number, daysBack = 90): { t: string; p: number }[] {
  const out: { t: string; p: number }[] = [];
  let p = end * (1 + (seed % 7) / 100 + 0.08);
  for (let i = daysBack; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    // Smooth random walk that ends near `end`
    const drift = (end - p) * 0.04;
    const noise = (Math.sin(i * (1 + (seed % 5))) + Math.cos(i / 3)) * (end * 0.008);
    p = Math.max(end * 0.85, p + drift + noise);
    out.push({ t: d.toISOString().slice(0, 10), p: Math.round(p) });
  }
  // Force the last point exactly to current price
  out[out.length - 1] = { t: out[out.length - 1].t, p: end };
  return out;
}

const base: Omit<Deal, "history" | "shop" | "countryCode" | "alternatives">[] = [
  {
    id: "1",
    asin: "B0CHX1W1XY",
    title: "Sony WH-1000XM5 Kabellose Noise Cancelling Kopfhörer",
    brand: "Sony",
    category: "Kopfhörer",
    imageUrl: "https://m.media-amazon.com/images/I/61+btxzpfDL._AC_SL1500_.jpg",
    condition: "like_new",
    priceCents: 24999,
    newPriceCents: 34900,
    msrpCents: 41900,
    currency: "EUR",
    inStock: true,
    firstSeenAt: "2025-06-14",
  },
  {
    id: "2",
    asin: "B0CSKKBQ1F",
    title: "Apple iPhone 15 128GB Schwarz",
    brand: "Apple",
    category: "Smartphones",
    imageUrl: "https://m.media-amazon.com/images/I/71d7rfSl0wL._AC_SL1500_.jpg",
    condition: "very_good",
    priceCents: 67990,
    newPriceCents: 79900,
    msrpCents: 89900,
    currency: "EUR",
    inStock: true,
    firstSeenAt: "2025-06-18",
  },
  {
    id: "3",
    asin: "B0CMDRCC9P",
    title: 'Apple MacBook Air 13" M3 8GB 256GB',
    brand: "Apple",
    category: "Laptops",
    imageUrl: "https://m.media-amazon.com/images/I/71jG+e7roXL._AC_SL1500_.jpg",
    condition: "like_new",
    priceCents: 99900,
    newPriceCents: 119900,
    msrpCents: 129900,
    currency: "EUR",
    inStock: true,
    firstSeenAt: "2025-06-19",
  },
  {
    id: "4",
    asin: "B0BSHF7WHW",
    title: "LG OLED evo C3 65 Zoll 4K Smart TV",
    brand: "LG",
    category: "TV & Audio",
    imageUrl: "https://m.media-amazon.com/images/I/91xQflDQGsL._AC_SL1500_.jpg",
    condition: "good",
    priceCents: 144900,
    newPriceCents: 179900,
    msrpCents: 249900,
    currency: "EUR",
    inStock: true,
    firstSeenAt: "2025-05-30",
  },
  {
    id: "5",
    asin: "B0CGJDKLB8",
    title: "Sony PlayStation 5 Slim Disc Edition",
    brand: "Sony",
    category: "Konsolen",
    imageUrl: "https://m.media-amazon.com/images/I/51051FiD9UL._AC_SL1080_.jpg",
    condition: "very_good",
    priceCents: 39900,
    newPriceCents: 49999,
    msrpCents: 54999,
    currency: "EUR",
    inStock: true,
    firstSeenAt: "2025-06-21",
  },
  {
    id: "6",
    asin: "B0BDHWDR12",
    title: 'Samsung Odyssey G9 49" Curved Gaming Monitor',
    brand: "Samsung",
    category: "Monitore",
    imageUrl: "https://m.media-amazon.com/images/I/71QcA8AhKBL._AC_SL1500_.jpg",
    condition: "like_new",
    priceCents: 89900,
    newPriceCents: 119900,
    msrpCents: 159900,
    currency: "EUR",
    inStock: true,
    firstSeenAt: "2025-06-10",
  },
  {
    id: "7",
    asin: "B09JQMJSXY",
    title: "Bose QuietComfort 45 Bluetooth Kopfhörer",
    brand: "Bose",
    category: "Kopfhörer",
    imageUrl: "https://m.media-amazon.com/images/I/51JbLBYjxgL._AC_SL1500_.jpg",
    condition: "good",
    priceCents: 17900,
    newPriceCents: 24900,
    msrpCents: 32999,
    currency: "EUR",
    inStock: true,
    firstSeenAt: "2025-06-05",
  },
  {
    id: "8",
    asin: "B0BDJ279KF",
    title: "Apple AirPods Pro (2. Gen) mit USB-C",
    brand: "Apple",
    category: "Kopfhörer",
    imageUrl: "https://m.media-amazon.com/images/I/61SUj2aKoEL._AC_SL1500_.jpg",
    condition: "like_new",
    priceCents: 19990,
    newPriceCents: 23900,
    msrpCents: 27900,
    currency: "EUR",
    inStock: false,
    firstSeenAt: "2025-06-17",
  },
  {
    id: "9",
    asin: "B0CN9RFFVT",
    title: "Sony Alpha 7 IV Vollformat Systemkamera",
    brand: "Sony",
    category: "Kameras",
    imageUrl: "https://m.media-amazon.com/images/I/81C6XypEcKL._AC_SL1500_.jpg",
    condition: "very_good",
    priceCents: 219000,
    newPriceCents: 259900,
    msrpCents: 289900,
    currency: "EUR",
    inStock: true,
    firstSeenAt: "2025-06-12",
  },
  {
    id: "10",
    asin: "B0CMZJ6JXP",
    title: "Dyson V15 Detect Absolute Akkusauger",
    brand: "Dyson",
    category: "Smart Home",
    imageUrl: "https://m.media-amazon.com/images/I/71Eb6gKr8VL._AC_SL1500_.jpg",
    condition: "good",
    priceCents: 49900,
    newPriceCents: 64900,
    msrpCents: 79900,
    currency: "EUR",
    inStock: true,
    firstSeenAt: "2025-05-28",
  },
  {
    id: "11",
    asin: "B09Y1S7ZX5",
    title: 'Dell XPS 15 9530, 13. Gen i7, 16GB RAM, 512GB SSD, RTX 4050',
    brand: "Dell",
    category: "Laptops",
    imageUrl: "https://m.media-amazon.com/images/I/61KTbqBUUuL._AC_SL1500_.jpg",
    condition: "acceptable",
    priceCents: 119900,
    newPriceCents: 169900,
    msrpCents: 199900,
    currency: "EUR",
    inStock: true,
    firstSeenAt: "2025-06-20",
  },
  {
    id: "12",
    asin: "B0CV2DCK68",
    title: "Samsung Galaxy S24 Ultra 256GB Titanium Black",
    brand: "Samsung",
    category: "Smartphones",
    imageUrl: "https://m.media-amazon.com/images/I/71RKfrCs5GL._AC_SL1500_.jpg",
    condition: "very_good",
    priceCents: 99900,
    newPriceCents: 119900,
    msrpCents: 149900,
    currency: "EUR",
    inStock: true,
    firstSeenAt: "2025-06-15",
  },
  {
    id: "13",
    asin: "B0BSLZ5T8N",
    title: "Bose Soundbar 900 mit Dolby Atmos",
    brand: "Bose",
    category: "TV & Audio",
    imageUrl: "https://m.media-amazon.com/images/I/61bNYE3RVPL._AC_SL1500_.jpg",
    condition: "like_new",
    priceCents: 64900,
    newPriceCents: 79900,
    msrpCents: 99900,
    currency: "EUR",
    inStock: true,
    firstSeenAt: "2025-06-08",
  },
  {
    id: "14",
    asin: "B0CYK24CSV",
    title: "Nintendo Switch OLED-Modell Weiß",
    brand: "Nintendo",
    category: "Konsolen",
    imageUrl: "https://m.media-amazon.com/images/I/61-PblYntsL._AC_SL1500_.jpg",
    condition: "good",
    priceCents: 26500,
    newPriceCents: 31900,
    msrpCents: 36500,
    currency: "EUR",
    inStock: true,
    firstSeenAt: "2025-06-09",
  },
  {
    id: "15",
    asin: "B0BCQXKQGM",
    title: "Philips Hue White & Color Starter Kit E27 (4er Pack + Bridge)",
    brand: "Philips",
    category: "Smart Home",
    imageUrl: "https://m.media-amazon.com/images/I/61-x0kfBzgL._AC_SL1500_.jpg",
    condition: "very_good",
    priceCents: 17900,
    newPriceCents: 21900,
    msrpCents: 27499,
    currency: "EUR",
    inStock: true,
    firstSeenAt: "2025-06-01",
  },
];

// Deterministic synthetic alternative offers for ~30 % of deals — gives the
// "Auch bei: …" teaser realistic coverage without overloading every card.
// Real data will come from feed adapters; structure mirrors the offers table.
const ALT_SHOPS: Array<"backmarket" | "rebuy" | "refurbed"> = ["backmarket", "rebuy", "refurbed"];

function altsFor(d: Omit<Deal, "history" | "shop" | "countryCode" | "alternatives">, i: number): AlternativeOffer[] {
  // Only some deals have alternatives (every 3rd, plus a couple specific ones).
  if (i % 3 !== 0 && i !== 1 && i !== 6) return [];
  const count = (i % 3) + 1; // 1–3 alternatives
  const out: AlternativeOffer[] = [];
  for (let k = 0; k < count; k++) {
    const shop = ALT_SHOPS[(i + k) % ALT_SHOPS.length];
    // Alternatives vary ±12 % around the WHD price.
    const factor = 1 + (((i * 7 + k * 13) % 25) - 12) / 100;
    const price = Math.round(d.priceCents * factor);
    out.push({
      shop,
      externalId: `${shop}-${d.asin}-${k}`,
      priceCents: price,
      currency: "EUR",
    });
  }
  return out;
}

export const MOCK_DEALS: Deal[] = base.map((d, i) => ({
  ...d,
  shop: "amazon-warehouse",
  countryCode: "DE",
  alternatives: altsFor(d, i),
  history: genHistory(i + 1, d.priceCents),
}));

export function discountPct(d: Pick<Deal, "priceCents" | "newPriceCents">): number {
  return Math.round((1 - d.priceCents / d.newPriceCents) * 100);
}

export function formatEUR(cents: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}
