-- 1) Convert has_role() to SECURITY INVOKER (RLS on user_roles allows a
--    signed-in user to read their own row, which is all every caller needs).
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 2) Re-schedule Keepa cron jobs to send the private KEEPA_SYNC_SECRET as a
--    Bearer token. The endpoints no longer accept the Supabase publishable key.
DO $$ BEGIN PERFORM cron.unschedule('keepa-refresh-prices-15min'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN PERFORM cron.unschedule('keepa-backfill-categories-30min'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN PERFORM cron.unschedule('keepa-sync-discovery-15min'); EXCEPTION WHEN OTHERS THEN NULL; END $$;

SELECT cron.schedule(
  'keepa-refresh-prices-15min',
  '7-59/15 * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://whdfinder.lovable.app/api/public/hooks/keepa-refresh',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer 0FhZf2emOZ_O33d6wdKTRGE_FCGpUBAl3JaOPBlGiQ6GMfPOnTw3Gq4Ksquak3no'
    ),
    body := jsonb_build_object('batchSize', 200, 'staleAfterHours', 6)
  );
  $cron$
);

SELECT cron.schedule(
  'keepa-backfill-categories-30min',
  '2,32 * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://whdfinder.lovable.app/api/public/hooks/keepa-backfill-categories',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer 0FhZf2emOZ_O33d6wdKTRGE_FCGpUBAl3JaOPBlGiQ6GMfPOnTw3Gq4Ksquak3no'
    ),
    body := jsonb_build_object('limit', 200, 'inStockOnly', true)
  );
  $cron$
);

SELECT cron.schedule(
  'keepa-sync-discovery-15min',
  '*/15 * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://whdfinder.lovable.app/api/public/hooks/keepa-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer 0FhZf2emOZ_O33d6wdKTRGE_FCGpUBAl3JaOPBlGiQ6GMfPOnTw3Gq4Ksquak3no'
    ),
    body := jsonb_build_object(
      'startPage', ((floor(extract(epoch from now()) / 900)::int * 4) % 32),
      'maxPages', 4,
      'minDiscount', (ARRAY[5, 10, 15, 20])[((floor(extract(epoch from now()) / 900)::int) % 4) + 1],
      'dateRange', (floor(extract(epoch from now()) / 900)::int) % 4,
      'priceType', (ARRAY[9, 19, 20, 21])[((floor(extract(epoch from now()) / 900)::int) % 4) + 1],
      'electronicsOnly', false,
      'enrichNewAsins', true,
      'maxEnrich', 60
    )
  );
  $cron$
);