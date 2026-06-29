// Country / marketplace registry. MVP: only DE is enabled.
// Adding a country = flip `active` and ensure shops + affiliate tags exist for it.

export type CountryCode = "DE" | "FR" | "IT" | "UK";

export type Marketplace = {
  code: CountryCode;
  flag: string;
  label: string;       // German UI label
  currency: "EUR" | "GBP";
  locale: string;
  active: boolean;
};

export const MARKETPLACES: Record<CountryCode, Marketplace> = {
  DE: { code: "DE", flag: "🇩🇪", label: "Deutschland", currency: "EUR", locale: "de-DE", active: true },
  FR: { code: "FR", flag: "🇫🇷", label: "Frankreich",   currency: "EUR", locale: "fr-FR", active: false },
  IT: { code: "IT", flag: "🇮🇹", label: "Italien",      currency: "EUR", locale: "it-IT", active: false },
  UK: { code: "UK", flag: "🇬🇧", label: "UK",           currency: "GBP", locale: "en-GB", active: false },
};

export const MARKETPLACE_LIST: Marketplace[] = Object.values(MARKETPLACES);

export const DEFAULT_COUNTRY: CountryCode = "DE";

export function formatPrice(cents: number, currency: "EUR" | "GBP", locale = "de-DE"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}
