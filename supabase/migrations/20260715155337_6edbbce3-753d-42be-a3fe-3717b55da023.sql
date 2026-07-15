
GRANT SELECT ON public.produtos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.produtos TO authenticated;
GRANT ALL ON public.produtos TO service_role;

GRANT SELECT ON public.categorias TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categorias TO authenticated;
GRANT ALL ON public.categorias TO service_role;

GRANT SELECT ON public.configuracoes_empresa TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.configuracoes_empresa TO authenticated;
GRANT ALL ON public.configuracoes_empresa TO service_role;
