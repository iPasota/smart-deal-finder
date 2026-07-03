select cron.unschedule('keepa-sync-every-15min');

select cron.schedule(
  'keepa-sync-pages-0-3',
  '0,20,40 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://whdfinder.lovable.app/api/public/hooks/keepa-sync',
    headers := jsonb_build_object('Content-Type', 'application/json', 'apikey', 'sb_publishable_fdf5zAnQ4V3RW6HIhdqk5g_YhqKuist'),
    body := '{"startPage":0,"maxPages":4,"minDiscount":10,"enrichNewAsins":true,"maxEnrich":40}'::jsonb
  );
  $$
);

select cron.schedule(
  'keepa-sync-pages-4-7',
  '5,25,45 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://whdfinder.lovable.app/api/public/hooks/keepa-sync',
    headers := jsonb_build_object('Content-Type', 'application/json', 'apikey', 'sb_publishable_fdf5zAnQ4V3RW6HIhdqk5g_YhqKuist'),
    body := '{"startPage":4,"maxPages":4,"minDiscount":10,"enrichNewAsins":true,"maxEnrich":40}'::jsonb
  );
  $$
);

select cron.schedule(
  'keepa-sync-pages-8-11',
  '10,30,50 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://whdfinder.lovable.app/api/public/hooks/keepa-sync',
    headers := jsonb_build_object('Content-Type', 'application/json', 'apikey', 'sb_publishable_fdf5zAnQ4V3RW6HIhdqk5g_YhqKuist'),
    body := '{"startPage":8,"maxPages":4,"minDiscount":10,"enrichNewAsins":true,"maxEnrich":40}'::jsonb
  );
  $$
);

select cron.schedule(
  'keepa-sync-pages-12-15',
  '15,35,55 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://whdfinder.lovable.app/api/public/hooks/keepa-sync',
    headers := jsonb_build_object('Content-Type', 'application/json', 'apikey', 'sb_publishable_fdf5zAnQ4V3RW6HIhdqk5g_YhqKuist'),
    body := '{"startPage":12,"maxPages":4,"minDiscount":10,"enrichNewAsins":true,"maxEnrich":40}'::jsonb
  );
  $$
);