// On-demand price history from Keepa. Called from the price-history modal.
// Cache-friendly: identical ASINs share the query cache in TanStack Query.
//
// Keepa CSV indices we use:
//   0 = Amazon price, 9 = Warehouse Deals (Used, from Amazon warehouse)
//
// CSV shape: alternating [keepaMinutes, price, keepaMinutes, price, ...].
// price = -1 means "not available at that time".

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type HistoryPoint = { t: string; p: number };

export const getPriceHistoryByAsin = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z.object({ asin: z.string().min(3).max(20) }).parse(d),
  )
  .handler(async ({ data }): Promise<HistoryPoint[]> => {
    try {
      const { fetchProducts, keepaMinutesToDate } = await import("@/lib/keepa.server");
      const r = await fetchProducts([data.asin], { stats: 365, history: 1 });
      const p = r.products?.[0] as unknown as { csv?: (number[] | null)[] } | undefined;
      const csv = p?.csv;
      if (!csv) return [];

      const extract = (idx: number): HistoryPoint[] => {
        const arr = csv[idx];
        if (!arr || arr.length < 2) return [];
        const out: HistoryPoint[] = [];
        for (let i = 0; i < arr.length - 1; i += 2) {
          const km = arr[i];
          const price = arr[i + 1];
          if (price == null || price < 0) continue;
          out.push({
            t: keepaMinutesToDate(km).toISOString().slice(0, 10),
            p: price,
          });
        }
        return out;
      };

      // Prefer warehouse; fall back to Amazon price when warehouse is sparse.
      const wh = extract(9);
      const src = wh.length >= 5 ? wh : [...extract(0), ...wh].sort((a, b) => a.t.localeCompare(b.t));

      // Keep last 365 days
      const cutoff = Date.now() - 365 * 86_400_000;
      return src.filter((x) => new Date(x.t).getTime() >= cutoff);
    } catch (err) {
      console.error("[getPriceHistoryByAsin]", err);
      return [];
    }
  });
