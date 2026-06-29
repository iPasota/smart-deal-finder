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

type BaseDeal = Omit<Deal, "history" | "countryCode" | "alternatives" | "shop"> & {
  shop?: Deal["shop"];
  alternatives?: AlternativeOffer[];
};

const base: BaseDeal[] = [
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

  // === Showcase: verschiedene Shop-Konstellationen ===

  // 16: Amazon only, KEINE Alternativen (Standardfall)
  {
    id: "16",
    asin: "B0CRDCXTQ4",
    title: "Anker Soundcore Liberty 4 NC In-Ear Kopfhörer",
    brand: "Anker",
    category: "Kopfhörer",
    imageUrl: "https://m.media-amazon.com/images/I/61TBkjqQX5L._AC_SL1500_.jpg",
    condition: "very_good",
    priceCents: 5499,
    newPriceCents: 7999,
    msrpCents: 9999,
    currency: "EUR",
    inStock: true,
    firstSeenAt: "2025-06-22",
    shop: "amazon-warehouse",
    alternatives: [],
  },

  // 17: reBuy-only — kein Amazon, kein Alternativ-Teaser
  {
    id: "17",
    asin: "REBUY-IPH14-001",
    title: "Apple iPhone 14 128GB Mitternacht",
    brand: "Apple",
    category: "Smartphones",
    imageUrl: "https://m.media-amazon.com/images/I/61iN13L5b8L._AC_SL1500_.jpg",
    condition: "good",
    priceCents: 48900,
    newPriceCents: 69900,
    msrpCents: 79900,
    currency: "EUR",
    inStock: true,
    firstSeenAt: "2025-06-23",
    shop: "rebuy",
    alternatives: [],
  },

  // 18: Back Market only
  {
    id: "18",
    asin: "BM-MBA-M2-256",
    title: 'Apple MacBook Air 13" M2 8GB 256GB (Generalüberholt)',
    brand: "Apple",
    category: "Laptops",
    imageUrl: "https://m.media-amazon.com/images/I/71vFKBpKakL._AC_SL1500_.jpg",
    condition: "very_good",
    priceCents: 79900,
    newPriceCents: 119900,
    msrpCents: 129900,
    currency: "EUR",
    inStock: true,
    firstSeenAt: "2025-06-21",
    shop: "backmarket",
    alternatives: [],
  },

  // 19: refurbed only
  {
    id: "19",
    asin: "RF-S23-128",
    title: "Samsung Galaxy S23 128GB Phantom Black (refurbished)",
    brand: "Samsung",
    category: "Smartphones",
    imageUrl: "https://m.media-amazon.com/images/I/61imIzqMrLL._AC_SL1500_.jpg",
    condition: "like_new",
    priceCents: 41900,
    newPriceCents: 64900,
    msrpCents: 84900,
    currency: "EUR",
    inStock: true,
    firstSeenAt: "2025-06-24",
    shop: "refurbed",
    alternatives: [],
  },

  // 20: Amazon + GENAU 1 Alternative (reBuy)
  {
    id: "20",
    asin: "B0BCH7L9YT",
    title: "GoPro HERO12 Black Action Cam",
    brand: "GoPro",
    category: "Kameras",
    imageUrl: "https://m.media-amazon.com/images/I/61X-+S4eUOL._AC_SL1500_.jpg",
    condition: "like_new",
    priceCents: 32900,
    newPriceCents: 39900,
    msrpCents: 44900,
    currency: "EUR",
    inStock: true,
    firstSeenAt: "2025-06-25",
    shop: "amazon-warehouse",
    alternatives: [
      { shop: "rebuy", externalId: "rebuy-hero12-001", priceCents: 35900, currency: "EUR" },
    ],
  },

  // 21: Amazon + 2 Alternativen (eine günstiger als Amazon!)
  {
    id: "21",
    asin: "B09G3HRMVB",
    title: "Apple Watch Series 9 GPS 45mm Aluminium",
    brand: "Apple",
    category: "Smart Home",
    imageUrl: "https://m.media-amazon.com/images/I/71sRYZbo3xL._AC_SL1500_.jpg",
    condition: "very_good",
    priceCents: 34900,
    newPriceCents: 44900,
    msrpCents: 49900,
    currency: "EUR",
    inStock: true,
    firstSeenAt: "2025-06-26",
    shop: "amazon-warehouse",
    alternatives: [
      { shop: "backmarket", externalId: "bm-aw9-001", priceCents: 31900, currency: "EUR" },
      { shop: "refurbed",   externalId: "rf-aw9-001", priceCents: 36500, currency: "EUR" },
    ],
  },

  // 22: Amazon + ALLE 3 Alternativen — maximaler Vergleich
  {
    id: "22",
    asin: "B0CHX3QBCH",
    title: "Apple iPad Air 11 (M2) WiFi 128GB Space Grau",
    brand: "Apple",
    category: "Laptops",
    imageUrl: "https://m.media-amazon.com/images/I/61bw7g9enrL._AC_SL1500_.jpg",
    condition: "like_new",
    priceCents: 62900,
    newPriceCents: 79900,
    msrpCents: 84900,
    currency: "EUR",
    inStock: true,
    firstSeenAt: "2025-06-27",
    shop: "amazon-warehouse",
    alternatives: [
      { shop: "backmarket", externalId: "bm-ipa-m2-001", priceCents: 64900, currency: "EUR" },
      { shop: "rebuy",      externalId: "rebuy-ipa-001", priceCents: 59900, currency: "EUR" },
      { shop: "refurbed",   externalId: "rf-ipa-001",    priceCents: 66900, currency: "EUR" },
    ],
  },

  // 23: reBuy + Alternative bei Back Market (kein Amazon)
  {
    id: "23",
    asin: "REBUY-PIXEL8-128",
    title: "Google Pixel 8 128GB Obsidian",
    brand: "Google",
    category: "Smartphones",
    imageUrl: "https://m.media-amazon.com/images/I/71jq6xfP4xL._AC_SL1500_.jpg",
    condition: "very_good",
    priceCents: 38900,
    newPriceCents: 54900,
    msrpCents: 79900,
    currency: "EUR",
    inStock: true,
    firstSeenAt: "2025-06-19",
    shop: "rebuy",
    alternatives: [
      { shop: "backmarket", externalId: "bm-pixel8-001", priceCents: 41900, currency: "EUR" },
    ],
  },

  // 24: refurbed + 2 Alternativen (Back Market + reBuy)
  {
    id: "24",
    asin: "RF-MBP-M3-512",
    title: 'Apple MacBook Pro 14" M3 18GB 512GB (refurbished)',
    brand: "Apple",
    category: "Laptops",
    imageUrl: "https://m.media-amazon.com/images/I/61RJn0ofUgL._AC_SL1500_.jpg",
    condition: "very_good",
    priceCents: 149900,
    newPriceCents: 199900,
    msrpCents: 229900,
    currency: "EUR",
    inStock: true,
    firstSeenAt: "2025-06-26",
    shop: "refurbed",
    alternatives: [
      { shop: "backmarket", externalId: "bm-mbp-m3-001", priceCents: 154900, currency: "EUR" },
      { shop: "rebuy",      externalId: "rebuy-mbp-001", priceCents: 147900, currency: "EUR" },
    ],
  },

  // 25: Back Market + Amazon-Alternative + refurbed (vergriffen bei Back Market)
  {
    id: "25",
    asin: "BM-S24-256",
    title: "Samsung Galaxy S24 256GB Onyx Black (Generalüberholt)",
    brand: "Samsung",
    category: "Smartphones",
    imageUrl: "https://m.media-amazon.com/images/I/61imIzqMrLL._AC_SL1500_.jpg",
    condition: "like_new",
    priceCents: 56900,
    newPriceCents: 89900,
    msrpCents: 99900,
    currency: "EUR",
    inStock: false,
    firstSeenAt: "2025-06-20",
    shop: "backmarket",
    alternatives: [
      { shop: "amazon-warehouse", externalId: "B0CV2DCK68", priceCents: 59900, currency: "EUR" },
      { shop: "refurbed",         externalId: "rf-s24-001", priceCents: 58900, currency: "EUR" },
    ],
  },

  // 26: Amazon-only, mega Rabatt
  {
    id: "26",
    asin: "B0CGY7K7HQ",
    title: "DJI Mini 4 Pro Fly More Combo Plus",
    brand: "DJI",
    category: "Kameras",
    imageUrl: "https://m.media-amazon.com/images/I/61EpgIYqWmL._AC_SL1500_.jpg",
    condition: "like_new",
    priceCents: 89900,
    newPriceCents: 159900,
    msrpCents: 169900,
    currency: "EUR",
    inStock: true,
    firstSeenAt: "2025-06-28",
    shop: "amazon-warehouse",
    alternatives: [],
  },
];

// Deterministic synthetic alternative offers for entries that don't define
// their own alternatives array — keeps showroom-style variety in the listing.
// Real data will come from feed adapters; structure mirrors the offers table.
const ALT_SHOPS: Array<"backmarket" | "rebuy" | "refurbed"> = ["backmarket", "rebuy", "refurbed"];

function autoAltsFor(d: BaseDeal, i: number): AlternativeOffer[] {
  // Only some deals get auto-alternatives (every 3rd, plus a couple specific ones).
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

// Reliable product imagery per category (Unsplash). Amazon's media CDN
// hotlinks are flaky in mock mode (many SKUs 404), so we override imageUrl
// deterministically by id+category until the real feed lands.
const CATEGORY_IMAGES: Record<string, string[]> = {
  "Kopfhörer": [
    "photo-1505740420928-5e560c06d30e",
    "photo-1583394838336-acd977736f90",
    "photo-1546435770-a3e426bf472b",
  ],
  "Smartphones": [
    "photo-1511707171634-5f897ff02aa9",
    "photo-1592750475338-74b7b21085ab",
    "photo-1565849904461-04a58ad377e0",
  ],
  "Laptops": [
    "photo-1496181133206-80ce9b88a853",
    "photo-1517336714731-489689fd1ca8",
    "photo-1611186871348-b1ce696e52c9",
  ],
  "Monitore": [
    "photo-1547119957-637f8679db1e",
    "photo-1593640408182-31c70c8268f5",
    "photo-1527443224154-c4a3942d3acf",
  ],
  "Kameras": [
    "photo-1502920917128-1aa500764cbd",
    "photo-1516035069371-29a1b244cc32",
    "photo-1606986628253-7ddf2c1c2c61",
  ],
  "TV & Audio": [
    "photo-1593359677879-a4bb92f829d1",
    "photo-1461151304267-38535e780c79",
    "photo-1542751371-adc38448a05e",
  ],
  "Konsolen": [
    "photo-1606144042614-b2417e99c4e3",
    "photo-1612287230202-1ff1d85d1bdf",
    "photo-1621259182978-fbf93132d53d",
  ],
  "Smart Home": [
    "photo-1558002038-1055907df827",
    "photo-1567925086230-3b8b8a3b8e1a",
    "photo-1585399000684-d2f72660f092",
  ],
};

function pickImage(category: string, id: string): string {
  const pool = CATEGORY_IMAGES[category] ?? CATEGORY_IMAGES["Smart Home"];
  const hash = [...id].reduce((a, c) => a + c.charCodeAt(0), 0);
  const photo = pool[hash % pool.length];
  return `https://images.unsplash.com/${photo}?w=800&q=80&auto=format&fit=crop`;
}

export const MOCK_DEALS: Deal[] = base.map((d, i) => ({
  ...d,
  imageUrl: pickImage(d.category, d.id),
  shop: d.shop ?? "amazon-warehouse",
  countryCode: "DE",
  alternatives: d.alternatives ?? autoAltsFor(d, i),
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
