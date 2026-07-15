
CREATE TABLE public.home_slides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  imagem_url TEXT NOT NULL,
  link_url TEXT,
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT ON public.home_slides TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.home_slides TO authenticated;
GRANT ALL ON public.home_slides TO service_role;

ALTER TABLE public.home_slides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active slides"
  ON public.home_slides FOR SELECT
  USING (ativo = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert slides"
  ON public.home_slides FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update slides"
  ON public.home_slides FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete slides"
  ON public.home_slides FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_home_slides_updated_at
  BEFORE UPDATE ON public.home_slides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
