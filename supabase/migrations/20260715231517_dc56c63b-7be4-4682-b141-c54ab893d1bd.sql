
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categorias TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clientes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.configuracoes_empresa TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.configuracoes_envio TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.configuracoes_whatsapp TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.enderecos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.home_slides TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.itens_pedido TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.oferta_popup TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pedidos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.produtos TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;

GRANT ALL ON public.categorias TO service_role;
GRANT ALL ON public.clientes TO service_role;
GRANT ALL ON public.configuracoes_empresa TO service_role;
GRANT ALL ON public.configuracoes_envio TO service_role;
GRANT ALL ON public.configuracoes_whatsapp TO service_role;
GRANT ALL ON public.enderecos TO service_role;
GRANT ALL ON public.home_slides TO service_role;
GRANT ALL ON public.itens_pedido TO service_role;
GRANT ALL ON public.oferta_popup TO service_role;
GRANT ALL ON public.pedidos TO service_role;
GRANT ALL ON public.produtos TO service_role;
GRANT ALL ON public.user_roles TO service_role;

GRANT SELECT ON public.categorias TO anon;
GRANT SELECT ON public.home_slides TO anon;
GRANT SELECT ON public.produtos TO anon;
