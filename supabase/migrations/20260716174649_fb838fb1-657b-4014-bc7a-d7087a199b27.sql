
-- Tabela de seções da home (4 fixas)
CREATE TABLE public.home_secoes (
  numero smallint PRIMARY KEY CHECK (numero BETWEEN 1 AND 4),
  titulo text NOT NULL DEFAULT '',
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.home_secoes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.home_secoes TO authenticated;
GRANT ALL ON public.home_secoes TO service_role;

ALTER TABLE public.home_secoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Home secoes leitura publica" ON public.home_secoes FOR SELECT USING (true);
CREATE POLICY "Home secoes admin gerencia" ON public.home_secoes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_home_secoes_updated BEFORE UPDATE ON public.home_secoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.home_secoes (numero, titulo) VALUES
  (1, 'Seção 1'), (2, 'Seção 2'), (3, 'Seção 3'), (4, 'Seção 4');

-- Coluna secao em home_slides e produtos
ALTER TABLE public.home_slides ADD COLUMN secao smallint NOT NULL DEFAULT 1 CHECK (secao BETWEEN 1 AND 4);
ALTER TABLE public.produtos ADD COLUMN secao smallint NOT NULL DEFAULT 1 CHECK (secao BETWEEN 1 AND 4);

CREATE INDEX idx_home_slides_secao ON public.home_slides(secao, ordem);
CREATE INDEX idx_produtos_secao ON public.produtos(secao);
