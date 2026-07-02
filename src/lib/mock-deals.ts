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
  // Last 90 days of warehouse prices, oldest first. Empty when history not loaded.
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

export function discountPct(d: Pick<Deal, "priceCents" | "newPriceCents">): number {
  if (!d.newPriceCents || d.newPriceCents <= d.priceCents) return 0;
  return Math.round((1 - d.priceCents / d.newPriceCents) * 100);
}

export function formatEUR(cents: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}
