import { createServerFn } from "@tanstack/react-start";

export type FreteOpcao = {
  id: string;
  nome: string;
  empresa: string;
  preco: number;
  prazo_dias: number;
};

type Input = {
  cep_destino: string;
  itens: Array<{ id?: string; quantidade: number }>;
  subtotal: number;
};

function onlyDigits(s: string) {
  return (s || "").replace(/\D/g, "");
}

function validate(i: unknown): Input {
  if (!i || typeof i !== "object") throw new Error("Dados inválidos");
  const inp = i as Input;
  if (onlyDigits(inp.cep_destino).length !== 8) throw new Error("CEP inválido");
  if (!Array.isArray(inp.itens) || inp.itens.length === 0) throw new Error("Carrinho vazio");
  return inp;
}

export const calcularFrete = createServerFn({ method: "POST" })
  .validator((i: unknown) => validate(i))
  .handler(async ({ data }): Promise<FreteOpcao[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const token = process.env.MELHOR_ENVIO_TOKEN;

    const { data: cfg } = await supabaseAdmin
      .from("configuracoes_envio")
      .select(
        "cep_origem, usa_pac, usa_sedex, peso_padrao_kg, altura_cm, largura_cm, comprimento_cm, prazo_adicional_dias, frete_gratis_acima, frete_fixo"
      )
      .limit(1)
      .maybeSingle();

    // Frete grátis por faixa de valor
    if (cfg?.frete_gratis_acima != null && data.subtotal >= Number(cfg.frete_gratis_acima)) {
      return [
        {
          id: "gratis",
          nome: "Frete Grátis",
          empresa: "Cortesia",
          preco: 0,
          prazo_dias: (cfg?.prazo_adicional_dias ?? 0) + 5,
        },
      ];
    }

    // Frete fixo configurado
    if (cfg?.frete_fixo != null) {
      return [
        {
          id: "fixo",
          nome: "Entrega padrão",
          empresa: "Loja",
          preco: Number(cfg.frete_fixo),
          prazo_dias: (cfg?.prazo_adicional_dias ?? 0) + 5,
        },
      ];
    }

    if (!token || !cfg?.cep_origem) {
      throw new Error(
        "Cálculo de frete indisponível. Configure Melhor Envio ou frete fixo no painel."
      );
    }

    // Busca dimensões/peso individuais dos produtos (usa padrão como fallback)
    const ids = data.itens.map((i) => i.id).filter(Boolean) as string[];
    const { data: prods } = ids.length
      ? await supabaseAdmin
          .from("produtos")
          .select("id, peso_g, altura_cm, largura_cm, comprimento_cm")
          .in("id", ids)
      : { data: [] as any[] };
    const prodMap = new Map<string, any>((prods || []).map((p) => [p.id, p]));

    const products = data.itens.map((it, idx) => {
      const p = it.id ? prodMap.get(it.id) : null;
      const pesoKg = p?.peso_g ? p.peso_g / 1000 : Number(cfg.peso_padrao_kg || 0.3);
      return {
        id: it.id || `item-${idx}`,
        width: p?.largura_cm || cfg.largura_cm || 12,
        height: p?.altura_cm || cfg.altura_cm || 4,
        length: p?.comprimento_cm || cfg.comprimento_cm || 17,
        weight: pesoKg,
        insurance_value: data.subtotal,
        quantity: it.quantidade,
      };
    });

    const services: number[] = [];
    if (cfg.usa_pac) services.push(1);
    if (cfg.usa_sedex) services.push(2);

    const res = await fetch("https://melhorenvio.com.br/api/v2/me/shipment/calculate", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "User-Agent": "Ingredientes Bio (contato@ingredientesbio.com.br)",
      },
      body: JSON.stringify({
        from: { postal_code: onlyDigits(cfg.cep_origem) },
        to: { postal_code: onlyDigits(data.cep_destino) },
        products,
        services: services.length ? services.join(",") : undefined,
      }),
    });

    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`Melhor Envio erro ${res.status}: ${t.slice(0, 200)}`);
    }

    const arr: any[] = await res.json();
    const adicional = cfg.prazo_adicional_dias || 0;
    return (Array.isArray(arr) ? arr : [])
      .filter((o) => !o.error && o.price)
      .map((o) => ({
        id: String(o.id),
        nome: o.name,
        empresa: o.company?.name || "",
        preco: Number(o.price),
        prazo_dias: Number(o.delivery_time || 0) + adicional,
      }));
  });
