
-- Add customization columns to configuracoes_empresa
ALTER TABLE public.configuracoes_empresa
  ADD COLUMN IF NOT EXISTS cor_primaria text DEFAULT '#248f8d',
  ADD COLUMN IF NOT EXISTS cor_botoes text DEFAULT '#248f8d',
  ADD COLUMN IF NOT EXISTS cor_header text DEFAULT '#397c2f',
  ADD COLUMN IF NOT EXISTS cor_background text DEFAULT '#ffffff',
  ADD COLUMN IF NOT EXISTS cor_texto_botoes text DEFAULT '#ffffff',
  ADD COLUMN IF NOT EXISTS rodape_texto text,
  ADD COLUMN IF NOT EXISTS rodape_cnpj text,
  ADD COLUMN IF NOT EXISTS rodape_endereco text,
  ADD COLUMN IF NOT EXISTS rodape_email text,
  ADD COLUMN IF NOT EXISTS rodape_telefone text;

-- Popup offer table
CREATE TABLE IF NOT EXISTS public.oferta_popup (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ativo boolean NOT NULL DEFAULT false,
  titulo text,
  descricao text,
  imagem_url text,
  cta_texto text DEFAULT 'Aproveitar oferta',
  cta_url text,
  mostrar_logo boolean NOT NULL DEFAULT true,
  auto_fechar_segundos integer NOT NULL DEFAULT 4,
  fechar_manualmente boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.oferta_popup TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.oferta_popup TO authenticated;
GRANT ALL ON public.oferta_popup TO service_role;

ALTER TABLE public.oferta_popup ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Qualquer um pode ver oferta ativa" ON public.oferta_popup
  FOR SELECT USING (true);
CREATE POLICY "Admins gerenciam oferta" ON public.oferta_popup
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_oferta_popup_updated_at
  BEFORE UPDATE ON public.oferta_popup
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed a single row so the admin can just edit it
INSERT INTO public.oferta_popup (ativo) VALUES (false)
  ON CONFLICT DO NOTHING;
