-- Enable cron + net for scheduled Keepa syncs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule Keepa sync every 30 minutes hitting the public endpoint
-- Uses the stable production URL, authenticated via the Supabase publishable key
SELECT cron.schedule(
  'keepa-sync-every-30min',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://whdfinder.lovable.app/api/public/hooks/keepa-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'sb_publishable_fdf5zAnQ4V3RW6HIhdqk5g_YhqKuist'
    ),
    body := '{}'::jsonb
  );
  $$
);