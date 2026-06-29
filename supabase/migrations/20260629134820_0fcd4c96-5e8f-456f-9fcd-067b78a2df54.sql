
-- =========================================================================
-- SHOPS
-- =========================================================================
CREATE TABLE public.shops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  display_name text NOT NULL,
  logo_url text,
  color text,
  link_rel text NOT NULL DEFAULT 'sponsored nofollow noopener',
  active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.shops TO anon, authenticated;
GRANT ALL ON public.shops TO service_role;
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shops public read" ON public.shops FOR SELECT USING (true);
CREATE TRIGGER shops_touch BEFORE UPDATE ON public.shops
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========================================================================
-- PRODUCTS — kanonisch, 1× pro Produkt
-- =========================================================================
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gtin text UNIQUE,
  mpn text,
  brand text,
  title text NOT NULL,
  category text,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX products_brand_mpn_idx ON public.products (brand, mpn) WHERE mpn IS NOT NULL;
CREATE INDEX products_category_idx ON public.products (category);
GRANT SELECT ON public.products TO anon, authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products public read" ON public.products FOR SELECT USING (true);
CREATE TRIGGER products_touch BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========================================================================
-- OFFERS — pro shop × country × condition
-- =========================================================================
CREATE TABLE public.offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE RESTRICT,
  country_code text NOT NULL CHECK (country_code IN ('DE','FR','IT','UK','US')),
  external_id text NOT NULL,
  condition text NOT NULL,
  price_cents integer NOT NULL,
  list_price_cents integer,
  currency text NOT NULL DEFAULT 'EUR',
  in_stock boolean NOT NULL DEFAULT true,
  ships_to text[] NOT NULL DEFAULT ARRAY[]::text[],
  deeplink_template text,
  affiliate_tag_override text,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shop_id, country_code, external_id, condition)
);
CREATE INDEX offers_product_idx ON public.offers (product_id);
CREATE INDEX offers_country_shop_idx ON public.offers (country_code, shop_id);
CREATE INDEX offers_price_idx ON public.offers (price_cents);
GRANT SELECT ON public.offers TO anon, authenticated;
GRANT ALL ON public.offers TO service_role;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "offers public read" ON public.offers FOR SELECT USING (true);
CREATE TRIGGER offers_touch BEFORE UPDATE ON public.offers
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========================================================================
-- PRICE HISTORY
-- =========================================================================
CREATE TABLE public.price_history (
  id bigserial PRIMARY KEY,
  offer_id uuid NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
  price_cents integer NOT NULL,
  observed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX price_history_offer_time_idx ON public.price_history (offer_id, observed_at DESC);
GRANT SELECT ON public.price_history TO anon, authenticated;
GRANT ALL ON public.price_history TO service_role;
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "price_history public read" ON public.price_history FOR SELECT USING (true);

-- =========================================================================
-- AFFILIATE TAGS — pro shop × country
-- =========================================================================
CREATE TABLE public.affiliate_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  country_code text NOT NULL CHECK (country_code IN ('DE','FR','IT','UK','US')),
  tag text NOT NULL,
  deeplink_pattern text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shop_id, country_code)
);
-- nicht öffentlich: Tags sind nicht geheim, aber gehören nicht ins Public-API
GRANT SELECT ON public.affiliate_tags TO authenticated;
GRANT ALL ON public.affiliate_tags TO service_role;
ALTER TABLE public.affiliate_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "affiliate_tags authenticated read" ON public.affiliate_tags
  FOR SELECT TO authenticated USING (true);
CREATE TRIGGER affiliate_tags_touch BEFORE UPDATE ON public.affiliate_tags
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========================================================================
-- SEED: Shops + DE/Amazon Affiliate Tag
-- =========================================================================
INSERT INTO public.shops (slug, display_name, color, active) VALUES
  ('amazon-warehouse', 'Amazon Warehouse', '#FF9900', true),
  ('backmarket',       'Back Market',      '#7ED957', false),
  ('rebuy',            'reBuy',            '#FF6B00', false),
  ('refurbed',         'refurbed',         '#00C896', false);

INSERT INTO public.affiliate_tags (shop_id, country_code, tag, deeplink_pattern)
SELECT id, 'DE', 'whdfinder-21',
       'https://www.amazon.de/dp/{external_id}/?tag={tag}'
FROM public.shops WHERE slug = 'amazon-warehouse';
