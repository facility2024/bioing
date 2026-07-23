
ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS frete_valor numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS frete_servico text,
  ADD COLUMN IF NOT EXISTS frete_prazo_dias integer,
  ADD COLUMN IF NOT EXISTS pagamento_status text NOT NULL DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS pagamento_id text,
  ADD COLUMN IF NOT EXISTS pagamento_metodo text,
  ADD COLUMN IF NOT EXISTS mp_preference_id text;

CREATE INDEX IF NOT EXISTS idx_pedidos_pagamento_id ON public.pedidos(pagamento_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_pagamento_status ON public.pedidos(pagamento_status);

ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS peso_g integer,
  ADD COLUMN IF NOT EXISTS altura_cm integer,
  ADD COLUMN IF NOT EXISTS largura_cm integer,
  ADD COLUMN IF NOT EXISTS comprimento_cm integer;
