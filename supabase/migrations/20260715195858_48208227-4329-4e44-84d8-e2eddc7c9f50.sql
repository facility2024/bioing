
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove old job if re-run
DO $$ BEGIN
  PERFORM cron.unschedule('cleanup-pedidos-pdf-daily');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

SELECT cron.schedule(
  'cleanup-pedidos-pdf-daily',
  '15 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://bioing.lovable.app/api/public/cron/cleanup-pedidos-pdf',
    headers := '{"Content-Type": "application/json", "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRwY3JrcHdidmRtZm9ob3hsZmNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxMTk2OTEsImV4cCI6MjA5OTY5NTY5MX0.UoJZNCjKLqScRJojYyUXBUQRK7J3Jwb7ttSL64H10aQ"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
