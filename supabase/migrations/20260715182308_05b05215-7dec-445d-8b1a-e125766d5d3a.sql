
ALTER TABLE public.configuracoes_envio
  ADD COLUMN IF NOT EXISTS cep_origem text,
  ADD COLUMN IF NOT EXISTS usa_pac boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS usa_sedex boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS peso_padrao_kg numeric NOT NULL DEFAULT 0.3,
  ADD COLUMN IF NOT EXISTS altura_cm integer NOT NULL DEFAULT 4,
  ADD COLUMN IF NOT EXISTS largura_cm integer NOT NULL DEFAULT 12,
  ADD COLUMN IF NOT EXISTS comprimento_cm integer NOT NULL DEFAULT 17,
  ADD COLUMN IF NOT EXISTS prazo_adicional_dias integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS frete_gratis_acima numeric,
  ADD COLUMN IF NOT EXISTS frete_fixo numeric,
  ADD COLUMN IF NOT EXISTS mao_do_correio text;
