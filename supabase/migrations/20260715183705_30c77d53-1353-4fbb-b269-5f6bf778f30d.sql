DROP POLICY IF EXISTS "Qualquer um pode criar cliente ao finalizar pedido" ON public.clientes;
DROP POLICY IF EXISTS "Qualquer um pode criar pedido" ON public.pedidos;
DROP POLICY IF EXISTS "Qualquer um pode criar itens de pedido" ON public.itens_pedido;
DROP POLICY IF EXISTS "Qualquer um pode criar endereço" ON public.enderecos;

REVOKE INSERT ON public.clientes FROM anon;
REVOKE INSERT ON public.pedidos FROM anon;
REVOKE INSERT ON public.itens_pedido FROM anon;
REVOKE INSERT ON public.enderecos FROM anon;
REVOKE USAGE, SELECT ON SEQUENCE public.pedido_numero_seq FROM anon;

DROP POLICY IF EXISTS "Qualquer um pode ver categorias ativas" ON public.categorias;
CREATE POLICY "Visitantes veem categorias ativas"
ON public.categorias
FOR SELECT
TO anon, authenticated
USING (ativo = true);

DROP POLICY IF EXISTS "Qualquer um pode ver produtos ativos" ON public.produtos;
CREATE POLICY "Visitantes veem produtos ativos"
ON public.produtos
FOR SELECT
TO anon, authenticated
USING (ativo = true);

DROP POLICY IF EXISTS "Admins veem todos os produtos" ON public.produtos;
CREATE POLICY "Admins veem todos os produtos"
ON public.produtos
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins veem todas as categorias" ON public.categorias;
CREATE POLICY "Admins veem todas as categorias"
ON public.categorias
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.handle_new_user_role() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user_role() TO service_role;