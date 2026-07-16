
ALTER TABLE public.home_slides DROP CONSTRAINT home_slides_secao_check;
ALTER TABLE public.home_slides ADD CONSTRAINT home_slides_secao_check CHECK (secao BETWEEN 1 AND 6);
ALTER TABLE public.produtos DROP CONSTRAINT produtos_secao_check;
ALTER TABLE public.produtos ADD CONSTRAINT produtos_secao_check CHECK (secao BETWEEN 1 AND 6);
ALTER TABLE public.home_secoes DROP CONSTRAINT home_secoes_numero_check;
ALTER TABLE public.home_secoes ADD CONSTRAINT home_secoes_numero_check CHECK (numero BETWEEN 1 AND 6);
INSERT INTO public.home_secoes (numero, titulo, ativo) VALUES (5, 'Seção 5', true), (6, 'Seção 6', true) ON CONFLICT (numero) DO NOTHING;
