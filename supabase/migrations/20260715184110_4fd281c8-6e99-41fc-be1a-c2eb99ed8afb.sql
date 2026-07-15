REVOKE INSERT, UPDATE, DELETE ON public.produtos FROM anon, PUBLIC;
REVOKE INSERT, UPDATE, DELETE ON public.categorias FROM anon, PUBLIC;
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM anon, PUBLIC;
REVOKE SELECT ON public.user_roles FROM anon, PUBLIC;

GRANT SELECT ON public.produtos TO anon;
GRANT SELECT ON public.categorias TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.produtos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categorias TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.produtos TO service_role;
GRANT ALL ON public.categorias TO service_role;
GRANT ALL ON public.user_roles TO service_role;