CREATE OR REPLACE FUNCTION public.abater_estoque(_produto_id uuid, _quantidade integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.produtos
  SET estoque = GREATEST(estoque - COALESCE(_quantidade, 0), 0)
  WHERE id = _produto_id AND controla_estoque = true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.abater_estoque(uuid, integer) TO authenticated, service_role;