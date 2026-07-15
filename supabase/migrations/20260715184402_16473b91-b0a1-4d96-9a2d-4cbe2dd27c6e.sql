GRANT SELECT ON public.home_slides TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.home_slides TO authenticated;
GRANT ALL ON public.home_slides TO service_role;

GRANT SELECT ON public.oferta_popup TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.oferta_popup TO authenticated;
GRANT ALL ON public.oferta_popup TO service_role;

GRANT SELECT ON public.configuracoes_empresa TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.configuracoes_empresa TO authenticated;
GRANT ALL ON public.configuracoes_empresa TO service_role;

GRANT SELECT ON public.configuracoes_envio TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.configuracoes_envio TO authenticated;
GRANT ALL ON public.configuracoes_envio TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.configuracoes_whatsapp TO authenticated;
GRANT ALL ON public.configuracoes_whatsapp TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.enderecos TO authenticated;
GRANT ALL ON public.enderecos TO service_role;