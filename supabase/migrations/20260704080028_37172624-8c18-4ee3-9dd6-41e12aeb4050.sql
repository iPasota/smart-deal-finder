
DELETE FROM public.price_history WHERE offer_id IN (
  SELECT o.id FROM public.offers o
  JOIN public.products p ON p.id = o.product_id
  WHERE p.asin !~ '^B[A-Z0-9]{9}$'
);
DELETE FROM public.offers WHERE product_id IN (
  SELECT id FROM public.products WHERE asin !~ '^B[A-Z0-9]{9}$'
);
DELETE FROM public.products WHERE asin !~ '^B[A-Z0-9]{9}$';
