REVOKE INSERT, UPDATE, DELETE ON public.home_slides FROM PUBLIC, anon;
REVOKE INSERT, UPDATE, DELETE ON public.oferta_popup FROM PUBLIC, anon;
REVOKE INSERT, UPDATE, DELETE ON public.configuracoes_empresa FROM PUBLIC, anon;
REVOKE INSERT, UPDATE, DELETE ON public.configuracoes_envio FROM PUBLIC, anon;
REVOKE ALL ON public.configuracoes_whatsapp FROM PUBLIC, anon;
REVOKE INSERT, UPDATE, DELETE ON public.enderecos FROM PUBLIC, anon;
REVOKE SELECT ON public.enderecos FROM PUBLIC, anon;

GRANT SELECT ON public.home_slides TO anon;
GRANT SELECT ON public.oferta_popup TO anon;
GRANT SELECT ON public.configuracoes_empresa TO anon;
GRANT SELECT ON public.configuracoes_envio TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.home_slides TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.oferta_popup TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.configuracoes_empresa TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.configuracoes_envio TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.configuracoes_whatsapp TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.enderecos TO authenticated;

GRANT ALL ON public.home_slides TO service_role;
GRANT ALL ON public.oferta_popup TO service_role;
GRANT ALL ON public.configuracoes_empresa TO service_role;
GRANT ALL ON public.configuracoes_envio TO service_role;
GRANT ALL ON public.configuracoes_whatsapp TO service_role;
GRANT ALL ON public.enderecos TO service_role;