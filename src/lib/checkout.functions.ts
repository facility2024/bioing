import { createServerFn } from "@tanstack/react-start";

type ItemPayload = { id?: string; nome: string; preco: number; quantidade: number };

type CheckoutInput = {
  cliente: {
    nome: string;
    telefone: string;
    email?: string;
    endereco?: string;
    cidade?: string;
    cep?: string;
    observacoes?: string;
  };
  itens: ItemPayload[];
  subtotal: number;
  frete: { valor: number; servico?: string; prazo_dias?: number };
  total: number;
};

function onlyDigits(s: string) {
  return (s || "").replace(/\D/g, "");
}

function validate(input: unknown): CheckoutInput {
  if (!input || typeof input !== "object") throw new Error("Dados inválidos");
  const i = input as CheckoutInput;
  if (!i.cliente?.nome?.trim()) throw new Error("Informe seu nome");
  if (onlyDigits(i.cliente?.telefone || "").length < 10) throw new Error("Telefone inválido");
  if (!Array.isArray(i.itens) || i.itens.length === 0) throw new Error("Carrinho vazio");
  if (!(i.total > 0)) throw new Error("Total inválido");
  return i;
}

/**
 * Cria o pedido em status 'pendente' de pagamento. Não envia WhatsApp nem abate estoque.
 * Retorna { pedido_id, numero } para uso pelo checkout de pagamento.
 */
export const criarPedidoPendente = createServerFn({ method: "POST" })
  .validator((i: unknown) => validate(i))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const telDigits = onlyDigits(data.cliente.telefone);

    // cliente
    const { data: existente } = await supabaseAdmin
      .from("clientes")
      .select("id")
      .eq("whatsapp", telDigits)
      .maybeSingle();
    let clienteId = existente?.id as string | undefined;
    if (clienteId) {
      await supabaseAdmin
        .from("clientes")
        .update({ nome: data.cliente.nome, email: data.cliente.email ?? null })
        .eq("id", clienteId);
    } else {
      const { data: novo, error } = await supabaseAdmin
        .from("clientes")
        .insert({
          nome: data.cliente.nome,
          whatsapp: telDigits,
          email: data.cliente.email ?? null,
        })
        .select("id")
        .single();
      if (error) throw new Error(`Erro ao criar cliente: ${error.message}`);
      clienteId = novo!.id;
    }

    const enderecoTxt = [data.cliente.endereco, data.cliente.cidade, data.cliente.cep]
      .filter(Boolean)
      .join(" - ");
    const observacoes =
      [
        enderecoTxt ? `Endereço: ${enderecoTxt}` : null,
        data.cliente.observacoes ? `Obs: ${data.cliente.observacoes}` : null,
      ]
        .filter(Boolean)
        .join(" | ") || null;

    const { data: pedido, error: errPed } = await supabaseAdmin
      .from("pedidos")
      .insert({
        cliente_id: clienteId!,
        subtotal: data.subtotal,
        total: data.total,
        status: "aguardando_pagamento",
        pagamento_status: "pendente",
        frete_valor: data.frete.valor,
        frete_servico: data.frete.servico ?? null,
        frete_prazo_dias: data.frete.prazo_dias ?? null,
        observacoes,
      })
      .select("id, numero")
      .single();
    if (errPed) throw new Error(`Erro ao criar pedido: ${errPed.message}`);

    const itensPayload = data.itens.map((it) => ({
      pedido_id: pedido!.id,
      produto_id: it.id ?? null,
      produto_nome: it.nome,
      quantidade: it.quantidade,
      valor_unitario: it.preco,
      valor_total: it.preco * it.quantidade,
    }));
    const { error: errItens } = await supabaseAdmin.from("itens_pedido").insert(itensPayload);
    if (errItens) throw new Error(`Erro ao criar itens: ${errItens.message}`);

    return { pedido_id: pedido!.id as string, numero: pedido!.numero as string };
  });
