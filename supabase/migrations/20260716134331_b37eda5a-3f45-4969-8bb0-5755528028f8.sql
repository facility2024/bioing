ALTER TABLE public.produtos
ADD COLUMN IF NOT EXISTS notificado_estoque_baixo boolean NOT NULL DEFAULT false;

-- Ao atualizar o estoque, se ficar acima do limite, zera o flag para permitir nova notificação futura.
CREATE OR REPLACE FUNCTION public.reset_flag_estoque_baixo()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.estoque > 3 AND NEW.notificado_estoque_baixo = true THEN
    NEW.notificado_estoque_baixo := false;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reset_flag_estoque_baixo ON public.produtos;
CREATE TRIGGER trg_reset_flag_estoque_baixo
BEFORE UPDATE OF estoque ON public.produtos
FOR EACH ROW
EXECUTE FUNCTION public.reset_flag_estoque_baixo();