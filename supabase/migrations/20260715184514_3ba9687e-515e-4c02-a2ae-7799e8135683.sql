DROP POLICY IF EXISTS "Anyone can view active slides" ON public.home_slides;
DROP POLICY IF EXISTS "Visitantes veem slides ativos" ON public.home_slides;
CREATE POLICY "Visitantes veem slides ativos"
ON public.home_slides
FOR SELECT
TO anon, authenticated
USING (ativo = true);

DROP POLICY IF EXISTS "Admins veem todos os slides" ON public.home_slides;
CREATE POLICY "Admins veem todos os slides"
ON public.home_slides
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

REVOKE INSERT, UPDATE, DELETE ON public.home_slides FROM anon, PUBLIC;
GRANT SELECT ON public.home_slides TO anon;