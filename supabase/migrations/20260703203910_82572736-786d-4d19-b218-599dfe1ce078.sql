select cron.unschedule('keepa-sync-every-30min');

select cron.schedule(
  'keepa-sync-every-15min',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://whdfinder.lovable.app/api/public/hooks/keepa-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'sb_publishable_fdf5zAnQ4V3RW6HIhdqk5g_YhqKuist'
    ),
    body := '{"maxPages":12,"minDiscount":10,"enrichNewAsins":true,"maxEnrich":100}'::jsonb
  );
  $$
);