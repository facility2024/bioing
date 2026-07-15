
CREATE TABLE public.configuracoes_empresa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_empresa TEXT,
  logo_url TEXT,
  whatsapp_atendimento TEXT,
  email_contato TEXT,
  endereco_empresa TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.configuracoes_empresa TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.configuracoes_empresa TO authenticated;
GRANT ALL ON public.configuracoes_empresa TO service_role;

ALTER TABLE public.configuracoes_empresa ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Qualquer um pode ler configurações da empresa"
  ON public.configuracoes_empresa FOR SELECT
  USING (true);

CREATE POLICY "Admins gerenciam configurações da empresa"
  ON public.configuracoes_empresa FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_configuracoes_empresa_updated_at
  BEFORE UPDATE ON public.configuracoes_empresa
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Registro inicial vazio para o admin preencher pelo painel
INSERT INTO public.configuracoes_empresa (nome_empresa) VALUES ('Minha Loja');
