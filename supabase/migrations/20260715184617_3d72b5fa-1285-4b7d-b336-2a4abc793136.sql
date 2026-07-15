DROP POLICY IF EXISTS "Admins can insert slides" ON public.home_slides;
CREATE POLICY "Admins podem criar slides"
ON public.home_slides
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));