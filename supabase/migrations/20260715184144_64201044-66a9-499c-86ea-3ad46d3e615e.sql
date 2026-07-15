REVOKE ALL ON public.clientes FROM PUBLIC, anon;
REVOKE ALL ON public.pedidos FROM PUBLIC, anon;
REVOKE ALL ON public.itens_pedido FROM PUBLIC, anon;
REVOKE ALL ON public.user_roles FROM PUBLIC, anon;
REVOKE ALL ON public.produtos FROM PUBLIC, anon;
REVOKE ALL ON public.categorias FROM PUBLIC, anon;

GRANT SELECT ON public.produtos TO anon;
GRANT SELECT ON public.categorias TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.clientes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pedidos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.itens_pedido TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.produtos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categorias TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;

GRANT ALL ON public.clientes TO service_role;
GRANT ALL ON public.pedidos TO service_role;
GRANT ALL ON public.itens_pedido TO service_role;
GRANT ALL ON public.produtos TO service_role;
GRANT ALL ON public.categorias TO service_role;
GRANT ALL ON public.user_roles TO service_role;