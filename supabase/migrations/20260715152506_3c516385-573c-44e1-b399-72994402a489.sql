
-- ============================================
-- ROLES SYSTEM
-- ============================================
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================
-- CATEGORIAS
-- ============================================
CREATE TABLE public.categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  ativo BOOLEAN NOT NULL DEFAULT true,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.categorias TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categorias TO authenticated;
GRANT ALL ON public.categorias TO service_role;
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Qualquer um pode ver categorias ativas"
  ON public.categorias FOR SELECT
  USING (ativo = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins gerenciam categorias"
  ON public.categorias FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_categorias_updated_at
  BEFORE UPDATE ON public.categorias
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- PRODUTOS
-- ============================================
CREATE TABLE public.produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  preco NUMERIC(10,2) NOT NULL CHECK (preco >= 0),
  imagem_url TEXT,
  categoria_id UUID REFERENCES public.categorias(id) ON DELETE SET NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  controla_estoque BOOLEAN NOT NULL DEFAULT false,
  estoque INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.produtos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.produtos TO authenticated;
GRANT ALL ON public.produtos TO service_role;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Qualquer um pode ver produtos ativos"
  ON public.produtos FOR SELECT
  USING (ativo = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins gerenciam produtos"
  ON public.produtos FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_produtos_updated_at
  BEFORE UPDATE ON public.produtos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_produtos_categoria ON public.produtos(categoria_id);
CREATE INDEX idx_produtos_ativo ON public.produtos(ativo);

-- ============================================
-- CLIENTES
-- ============================================
CREATE TABLE public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT INSERT ON public.clientes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clientes TO authenticated;
GRANT ALL ON public.clientes TO service_role;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Qualquer um pode criar cliente ao finalizar pedido"
  ON public.clientes FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins veem todos os clientes"
  ON public.clientes FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins atualizam clientes"
  ON public.clientes FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins deletam clientes"
  ON public.clientes FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_clientes_updated_at
  BEFORE UPDATE ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- ENDERECOS
-- ============================================
CREATE TABLE public.enderecos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  rua TEXT NOT NULL,
  numero TEXT NOT NULL,
  complemento TEXT,
  bairro TEXT NOT NULL,
  cidade TEXT NOT NULL,
  estado TEXT NOT NULL,
  cep TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT INSERT ON public.enderecos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.enderecos TO authenticated;
GRANT ALL ON public.enderecos TO service_role;
ALTER TABLE public.enderecos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Qualquer um pode criar endereço"
  ON public.enderecos FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins veem todos os endereços"
  ON public.enderecos FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_enderecos_cliente ON public.enderecos(cliente_id);

-- ============================================
-- GERADOR DE NÚMERO DE PEDIDO ÚNICO
-- Sequence garante que o número nunca se repita.
-- ============================================
CREATE SEQUENCE public.pedido_numero_seq START WITH 100000;

CREATE OR REPLACE FUNCTION public.gerar_numero_pedido()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  novo_num TEXT;
BEGIN
  novo_num := 'PED-' || LPAD(nextval('public.pedido_numero_seq')::TEXT, 6, '0');
  RETURN novo_num;
END;
$$;

-- ============================================
-- PEDIDOS
-- ============================================
CREATE TABLE public.pedidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero TEXT NOT NULL UNIQUE DEFAULT public.gerar_numero_pedido(),
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE RESTRICT,
  endereco_id UUID REFERENCES public.enderecos(id) ON DELETE SET NULL,
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'novo',
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT INSERT ON public.pedidos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pedidos TO authenticated;
GRANT ALL ON public.pedidos TO service_role;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Qualquer um pode criar pedido"
  ON public.pedidos FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins veem todos os pedidos"
  ON public.pedidos FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins atualizam pedidos"
  ON public.pedidos FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins deletam pedidos"
  ON public.pedidos FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_pedidos_updated_at
  BEFORE UPDATE ON public.pedidos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_pedidos_cliente ON public.pedidos(cliente_id);
CREATE INDEX idx_pedidos_status ON public.pedidos(status);
CREATE INDEX idx_pedidos_created ON public.pedidos(created_at DESC);

-- ============================================
-- ITENS_PEDIDO
-- ============================================
CREATE TABLE public.itens_pedido (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  produto_id UUID REFERENCES public.produtos(id) ON DELETE SET NULL,
  produto_nome TEXT NOT NULL,
  produto_descricao TEXT,
  quantidade INTEGER NOT NULL CHECK (quantidade > 0),
  valor_unitario NUMERIC(10,2) NOT NULL CHECK (valor_unitario >= 0),
  valor_total NUMERIC(10,2) NOT NULL CHECK (valor_total >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT INSERT ON public.itens_pedido TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.itens_pedido TO authenticated;
GRANT ALL ON public.itens_pedido TO service_role;
ALTER TABLE public.itens_pedido ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Qualquer um pode criar itens de pedido"
  ON public.itens_pedido FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins veem itens de pedido"
  ON public.itens_pedido FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_itens_pedido ON public.itens_pedido(pedido_id);

-- ============================================
-- CONFIGURACOES DE ENVIO
-- Tabela single-row: guarda o delay antes do envio ao WhatsApp.
-- ============================================
CREATE TABLE public.configuracoes_envio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delay_segundos INTEGER NOT NULL DEFAULT 0 CHECK (delay_segundos >= 0),
  whatsapp_destino TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.configuracoes_envio TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.configuracoes_envio TO authenticated;
GRANT ALL ON public.configuracoes_envio TO service_role;
ALTER TABLE public.configuracoes_envio ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Qualquer um pode ler configurações de envio"
  ON public.configuracoes_envio FOR SELECT
  USING (true);

CREATE POLICY "Admins gerenciam configurações"
  ON public.configuracoes_envio FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_configuracoes_envio_updated_at
  BEFORE UPDATE ON public.configuracoes_envio
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Registro inicial de configuração
INSERT INTO public.configuracoes_envio (delay_segundos) VALUES (0);
