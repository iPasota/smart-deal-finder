select cron.unschedule('keepa-sync-pages-0-3');
select cron.unschedule('keepa-sync-pages-4-7');
select cron.unschedule('keepa-sync-pages-8-11');
select cron.unschedule('keepa-sync-pages-12-15');

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
    body := '{"maxPages":4,"minDiscount":10,"enrichNewAsins":true,"maxEnrich":40}'::jsonb
  );
  $$
);