
CREATE TABLE public.affiliate_clicks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id TEXT NOT NULL,
  shop TEXT NOT NULL,
  position TEXT NOT NULL DEFAULT 'primary',
  country TEXT,
  referrer_host TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX affiliate_clicks_created_at_idx ON public.affiliate_clicks (created_at DESC);
CREATE INDEX affiliate_clicks_shop_idx ON public.affiliate_clicks (shop, created_at DESC);
CREATE INDEX affiliate_clicks_deal_idx ON public.affiliate_clicks (deal_id, created_at DESC);

GRANT ALL ON public.affiliate_clicks TO service_role;

ALTER TABLE public.affiliate_clicks ENABLE ROW LEVEL SECURITY;

-- No public policies: writes go through the /api/public/track-click route using service_role.
-- Reads happen via admin/dashboard only (service_role bypasses RLS).
