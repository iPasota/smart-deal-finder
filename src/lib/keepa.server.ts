// Keepa API client. Server-only (.server.ts prevents client bundling).
// Docs: https://keepa.com/#!discuss/api
//
// Key concepts:
// - Domain IDs: 1=US, 2=UK, 3=DE, 4=FR, 5=JP, 6=CA, 8=IT, 9=ES, 10=IN, 11=MX
// - Price types (for /deal endpoint priceTypes filter):
//     0=Amazon, 1=Marketplace New, 2=Marketplace Used, 3=Sales Rank,
//     4=Listprice, 5=Collectible, 6=Trade-In, 7=Warehouse Deals, 8=NewFBA,
//     9=Lightning Deal, 10=Rental, 18=Buy Box
// - Condition codes (offers): 0=Unknown, 1=New, 2=Used-Like-New,
//     3=Used-Very-Good, 4=Used-Good, 5=Used-Acceptable, 6=Refurbished,
//     11=Collectible-Like-New, ...
// - Prices are in the smallest currency subunit (cents). -1 = no data.
//
// Rate limit: your account tier defines tokens/min (we default to 20).
// Every response includes `tokensLeft` and `refillRate` — we cache them
// and self-throttle so we never see a 429.

const KEEPA_BASE = "https://api.keepa.com";
const DE_DOMAIN = 3;

export type KeepaDealsResponse = {
  dr: Array<{
    asin: string;
    title?: string;
    image?: string | null;
    rootCategory?: number;
    categoryTree?: Array<{ catId: number; name: string }>;
    current?: number[]; // indexed by price type
    avg?: number[]; // 30 day avg by price type
    avg90?: number[];
    salesRankReference?: number;
    lastUpdate?: number; // keepa minutes
    deltaPercent?: number[]; // discount % by price type
    creationDate?: number;
  }>;
  totalResults?: number;
  tokensLeft: number;
  refillIn?: number;
  refillRate: number;
  timestamp?: number;
};

export type KeepaProductResponse = {
  products: Array<{
    asin: string;
    title: string;
    brand?: string | null;
    manufacturer?: string | null;
    productGroup?: string | null;
    eanList?: string[] | null;
    upcList?: string[] | null;
    imagesCSV?: string | null;
    salesRanks?: Record<string, number[]> | null;
    stats?: {
      current?: number[];
      avg30?: number[];
      avg90?: number[];
      salesRankDrops30?: number;
    } | null;
    categoryTree?: Array<{ catId: number; name: string }> | null;
  }>;
  tokensLeft: number;
  refillRate: number;
};

// Deal query selection object. Warehouse-only, DE, sorted by biggest discount.
// See https://keepa.com/#!discuss/t/deals-request/1489 for full schema.
export type DealSelection = {
  page: number;
  domainId: number;
  priceTypes: number[]; // [7] = warehouse
  deltaPercentRange?: [number, number]; // e.g. [10, 100] = 10-100% off
  currentRange?: [number, number]; // price cents range
  isRangeEnabled?: boolean;
  isFilterEnabled?: boolean;
  hasReviews?: boolean;
  sortType?: number; // 4 = deltaPercent desc
  dateRange?: number; // 0=day, 1=week, 2=month, 3=3month
  excludeCategories?: number[];
  includeCategories?: number[];
};

class KeepaTokenBucket {
  private tokensLeft = 20;
  private refillRate = 20; // per minute
  private lastRefillCheck = Date.now();
  private lastResponseAt = 0;

  update(tokensLeft: number, refillRate: number) {
    this.tokensLeft = tokensLeft;
    this.refillRate = refillRate;
    this.lastResponseAt = Date.now();
    this.lastRefillCheck = Date.now();
  }

  private projectedTokens(): number {
    // Interpolate refill since last response.
    const minutesSince = (Date.now() - this.lastRefillCheck) / 60000;
    return Math.min(this.refillRate * 4, this.tokensLeft + minutesSince * this.refillRate);
  }

  async reserve(cost: number): Promise<void> {
    // Wait until we have at least (cost + 2) tokens as safety margin.
    const need = cost + 2;
    while (this.projectedTokens() < need) {
      const missing = need - this.projectedTokens();
      const waitMs = Math.max(500, Math.ceil((missing / this.refillRate) * 60000));
      await new Promise((r) => setTimeout(r, Math.min(waitMs, 15000)));
    }
    this.tokensLeft = this.projectedTokens() - cost;
    this.lastRefillCheck = Date.now();
  }

  get status() {
    return {
      tokensLeft: Math.floor(this.projectedTokens()),
      refillRate: this.refillRate,
    };
  }
}

const bucket = new KeepaTokenBucket();

function getApiKey(): string {
  const key = process.env.KEEPA_API_KEY;
  if (!key) throw new Error("KEEPA_API_KEY is not configured");
  return key;
}

async function keepaFetch<T>(
  path: string,
  init: RequestInit,
  estimatedCost: number,
): Promise<T> {
  await bucket.reserve(estimatedCost);
  const url = `${KEEPA_BASE}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Keepa ${path} ${res.status}: ${text.slice(0, 300)}`);
  }
  const data = (await res.json()) as T & { tokensLeft?: number; refillRate?: number };
  if (typeof data.tokensLeft === "number" && typeof data.refillRate === "number") {
    bucket.update(data.tokensLeft, data.refillRate);
  }
  return data as T;
}

export function tokenStatus() {
  return bucket.status;
}

// Fetch one page of warehouse deals on amazon.de sorted by biggest discount.
export async function fetchWarehouseDealsPage(
  page: number,
  overrides: Partial<DealSelection> = {},
): Promise<KeepaDealsResponse> {
  const selection: DealSelection = {
    page,
    domainId: DE_DOMAIN,
    priceTypes: [7], // Warehouse Deals
    deltaPercentRange: [10, 100],
    isRangeEnabled: true,
    isFilterEnabled: true,
    sortType: 4, // biggest delta % first
    dateRange: 1, // last week
    ...overrides,
  };
  const key = getApiKey();
  // /deal cost ~5 tokens per call, returns up to 150 deals per page.
  return keepaFetch<KeepaDealsResponse>(
    `/deal?key=${key}`,
    {
      method: "POST",
      body: JSON.stringify({ selection }),
    },
    5,
  );
}

// Fetch product details for up to 100 ASINs at once.
// Cost: ~1 token per ASIN (stats adds ~1, history=1 adds a few).
export async function fetchProducts(
  asins: string[],
  opts: { stats?: number; history?: 0 | 1 } = {},
): Promise<KeepaProductResponse> {
  if (asins.length === 0) {
    return { products: [], tokensLeft: bucket.status.tokensLeft, refillRate: bucket.status.refillRate };
  }
  const key = getApiKey();
  const stats = opts.stats ?? 90;
  const history = opts.history ?? 0;
  const asinParam = asins.slice(0, 100).join(",");
  const estimated = asins.length * (history ? 3 : 2);
  return keepaFetch<KeepaProductResponse>(
    `/product?key=${key}&domain=${DE_DOMAIN}&asin=${asinParam}&stats=${stats}&history=${history}`,
    { method: "GET" },
    estimated,
  );
}

// Keepa uses "Keepa minutes" since 2011-01-01. Convert to Date.
export function keepaMinutesToDate(km: number): Date {
  return new Date((km + 21564000) * 60_000);
}

// Convert Keepa price int (cents, -1 = no data) to number|null.
export function keepaPrice(n: number | undefined | null): number | null {
  if (n === undefined || n === null || n < 0) return null;
  return n;
}
