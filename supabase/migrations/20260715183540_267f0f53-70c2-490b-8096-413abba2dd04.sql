GRANT SELECT ON public.produtos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.produtos TO authenticated;
GRANT ALL ON public.produtos TO service_role;

GRANT SELECT ON public.categorias TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categorias TO authenticated;
GRANT ALL ON public.categorias TO service_role;

GRANT INSERT ON public.clientes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clientes TO authenticated;
GRANT ALL ON public.clientes TO service_role;

GRANT INSERT ON public.pedidos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pedidos TO authenticated;
GRANT ALL ON public.pedidos TO service_role;

GRANT INSERT ON public.itens_pedido TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.itens_pedido TO authenticated;
GRANT ALL ON public.itens_pedido TO service_role;

GRANT USAGE, SELECT ON SEQUENCE public.pedido_numero_seq TO anon, authenticated, service_role;

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;