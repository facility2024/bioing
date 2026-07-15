
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$ BEGIN
  PERFORM cron.unschedule('cleanup-pedidos-antigos-45d');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

SELECT cron.schedule(
  'cleanup-pedidos-antigos-45d',
  '30 3 * * *',
  $$
  DELETE FROM public.itens_pedido
  WHERE pedido_id IN (
    SELECT id FROM public.pedidos WHERE created_at < NOW() - INTERVAL '45 days'
  );
  DELETE FROM public.pedidos WHERE created_at < NOW() - INTERVAL '45 days';
  $$
);
