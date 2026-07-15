CREATE TABLE public.configuracoes_whatsapp (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  instance_id TEXT,
  api_token TEXT,
  numero_conectado TEXT,
  ativa BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.configuracoes_whatsapp TO authenticated;
GRANT ALL ON public.configuracoes_whatsapp TO service_role;
ALTER TABLE public.configuracoes_whatsapp ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins gerenciam whatsapp" ON public.configuracoes_whatsapp
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_configuracoes_whatsapp_updated_at
  BEFORE UPDATE ON public.configuracoes_whatsapp
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
INSERT INTO public.configuracoes_whatsapp (ativa) VALUES (false);