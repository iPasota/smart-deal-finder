-- Public read access for Data API (anon role)
GRANT SELECT ON public.shops TO anon;
GRANT SELECT ON public.products TO anon;
GRANT SELECT ON public.offers TO anon;
GRANT SELECT ON public.price_history TO anon;

-- Wipe first-test data (broken image URLs, book/junk categories)
DELETE FROM public.price_history;
DELETE FROM public.offers;
DELETE FROM public.products;