-- 1) Sync log table
CREATE TABLE public.keepa_sync_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  duration_ms INTEGER,
  sync_type TEXT NOT NULL DEFAULT 'deal_scan', -- 'deal_scan' | 'product_details' | 'price_refresh'
  tokens_consumed INTEGER,
  tokens_left INTEGER,
  refill_rate INTEGER,
  deals_fetched INTEGER DEFAULT 0,
  products_inserted INTEGER DEFAULT 0,
  offers_upserted INTEGER DEFAULT 0,
  price_history_rows INTEGER DEFAULT 0,
  errors JSONB,
  status TEXT NOT NULL DEFAULT 'running', -- 'running' | 'success' | 'partial' | 'failed'
  triggered_by TEXT NOT NULL DEFAULT 'cron' -- 'cron' | 'manual' | 'admin'
);

GRANT SELECT ON public.keepa_sync_log TO authenticated;
GRANT ALL ON public.keepa_sync_log TO service_role;

ALTER TABLE public.keepa_sync_log ENABLE ROW LEVEL SECURITY;

-- Any authenticated user may read logs (admins are gated at the route/UI level).
-- Tighten later with a has_role check once user_roles is set up.
CREATE POLICY "Authenticated can read sync log"
  ON public.keepa_sync_log FOR SELECT
  TO authenticated
  USING (true);

CREATE INDEX idx_keepa_sync_log_started_at ON public.keepa_sync_log (started_at DESC);

-- 2) Extend products for Keepa metadata
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS keepa_last_refreshed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sales_rank INTEGER,
  ADD COLUMN IF NOT EXISTS keepa_category_id BIGINT,
  ADD COLUMN IF NOT EXISTS asin TEXT;

CREATE INDEX IF NOT EXISTS idx_products_asin ON public.products (asin) WHERE asin IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_gtin ON public.products (gtin) WHERE gtin IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_keepa_refreshed ON public.products (keepa_last_refreshed_at NULLS FIRST);

-- 3) Extend offers for Keepa-specific fields
ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS keepa_domain_id SMALLINT DEFAULT 3, -- 3 = amazon.de
  ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS avg_price_30d_cents INTEGER,
  ADD COLUMN IF NOT EXISTS avg_price_90d_cents INTEGER;

-- Composite index for fast upsert lookup (shop + external ASIN + condition + country)
CREATE UNIQUE INDEX IF NOT EXISTS idx_offers_shop_external_condition_country
  ON public.offers (shop_id, external_id, condition, country_code);