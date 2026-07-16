REVOKE EXECUTE ON FUNCTION public.abater_estoque(uuid, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.abater_estoque(uuid, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.abater_estoque(uuid, integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.abater_estoque(uuid, integer) TO service_role;