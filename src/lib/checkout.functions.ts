import { createServerFn } from "@tanstack/react-start";

type ItemPayload = {
  nome: string;
  preco: number;
  quantidade: number;
};

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
  total: number;
};

const WAPI_BASE = "https://api.w-api.app/v1";

function onlyDigits(s: string) {
  return (s || "").replace(/\D/g, "");
}

function formatBRL(n: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
}

function validate(input: unknown): CheckoutInput {
  if (!input || typeof input !== "object") throw new Error("Dados inválidos");
  const i = input as CheckoutInput;
  if (!i.cliente?.nome?.trim()) throw new Error("Informe seu nome");
  if (onlyDigits(i.cliente?.telefone || "").length < 10) throw new Error("Telefone inválido (com DDD)");
  if (!Array.isArray(i.itens) || i.itens.length === 0) throw new Error("Carrinho vazio");
  return i;
}

export const finalizarPedidoWhatsapp = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => validate(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: config, error } = await supabaseAdmin
      .from("configuracoes_whatsapp")
      .select("instance_id, api_token, numero_conectado, ativa")
      .limit(1)
      .maybeSingle();

    if (error) throw new Error("Erro ao ler configuração do WhatsApp");
    if (!config?.instance_id || !config?.api_token) {
      throw new Error("WhatsApp da loja não configurado. Fale com o administrador.");
    }
    if (!config.numero_conectado) throw new Error("Número do atendente não configurado");


    const itensTxt = data.itens
      .map((it) => `• ${it.quantidade}x ${it.nome} — ${formatBRL(it.preco * it.quantidade)}`)
      .join("\n");

    const enderecoTxt = [data.cliente.endereco, data.cliente.cidade, data.cliente.cep]
      .filter(Boolean)
      .join(" - ");

    const rodapeEmpresa =
      `\n\n━━━━━━━━━━━━━━━\n` +
      `*BIOCON DO BRASIL PRODUTOS E SERVICOS LTDA - ME*\n` +
      `CNPJ: 51.909.772/0001-81\n` +
      `Endereço: R. São Bartolomeu, 785 - Vila San Martin, Sumaré - SP, 13180-310\n` +
      `✉️ *E-mail:* vendas@biocondobrasil.com.br`;

    const mensagemAtendente =
      `🛒 *Novo pedido recebido!*\n\n` +
      `👤 *Cliente:* ${data.cliente.nome}\n` +
      `📱 *Telefone:* ${data.cliente.telefone}\n` +
      (data.cliente.email ? `✉️ *E-mail:* ${data.cliente.email}\n` : "") +
      (enderecoTxt ? `📍 *Endereço:* ${enderecoTxt}\n` : "") +
      (data.cliente.observacoes ? `📝 *Obs:* ${data.cliente.observacoes}\n` : "") +
      `\n*Itens:*\n${itensTxt}\n\n` +
      `💰 *Total:* ${formatBRL(data.total)}` +
      rodapeEmpresa;

    const mensagemCliente =
      `Olá *${data.cliente.nome}*! 👋\n\n` +
      `Recebemos seu pedido com sucesso! ✅\n\n` +
      `*Resumo do pedido:*\n${itensTxt}\n\n` +
      `💰 *Total:* ${formatBRL(data.total)}\n\n` +
      `Um atendente já está com sua solicitação e vai continuar por aqui mesmo pelo WhatsApp. 🚀\n` +
      `Fique à vontade, ele já está pronto para te atender!` +
      rodapeEmpresa;

    async function enviar(phone: string, message: string) {
      const url = `${WAPI_BASE}/message/send-text?instanceId=${encodeURIComponent(config!.instance_id!)}`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config!.api_token!}`,
        },
        body: JSON.stringify({ phone: onlyDigits(phone), message, delayMessage: 1 }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.error) {
        throw new Error(json?.message || json?.error || `HTTP ${res.status}`);
      }
    }

    // Atendente primeiro, depois cliente
    await enviar(config.numero_conectado, mensagemAtendente);
    await enviar(data.cliente.telefone, mensagemCliente);

    // Persistir cliente + pedido + itens
    try {
      const telDigits = onlyDigits(data.cliente.telefone);

      // Upsert cliente por whatsapp
      const { data: existente } = await supabaseAdmin
        .from("clientes")
        .select("id")
        .eq("whatsapp", telDigits)
        .maybeSingle();

      let clienteId = existente?.id as string | undefined;
      if (clienteId) {
        await supabaseAdmin
          .from("clientes")
          .update({
            nome: data.cliente.nome,
            email: data.cliente.email ?? null,
          })
          .eq("id", clienteId);
      } else {
        const { data: novo, error: errCli } = await supabaseAdmin
          .from("clientes")
          .insert({
            nome: data.cliente.nome,
            whatsapp: telDigits,
            email: data.cliente.email ?? null,
          })
          .select("id")
          .single();
        if (errCli) throw errCli;
        clienteId = novo!.id;
      }

      // Gerar número do pedido
      const { data: numRow } = await supabaseAdmin.rpc("gerar_numero_pedido");
      const numero = (numRow as unknown as string) || `PED-${Date.now()}`;

      const observacoes = [
        enderecoTxt ? `Endereço: ${enderecoTxt}` : null,
        data.cliente.observacoes ? `Obs: ${data.cliente.observacoes}` : null,
      ]
        .filter(Boolean)
        .join(" | ") || null;

      const { data: pedido, error: errPed } = await supabaseAdmin
        .from("pedidos")
        .insert({
          numero,
          cliente_id: clienteId!,
          subtotal: data.total,
          total: data.total,
          status: "novo",
          observacoes,
        })
        .select("id")
        .single();
      if (errPed) throw errPed;

      const itensPayload = data.itens.map((it) => ({
        pedido_id: pedido!.id,
        produto_nome: it.nome,
        quantidade: it.quantidade,
        valor_unitario: it.preco,
        valor_total: it.preco * it.quantidade,
      }));
      await supabaseAdmin.from("itens_pedido").insert(itensPayload);
    } catch (e) {
      console.error("Erro ao registrar pedido no banco:", e);
    }

    return { ok: true };
  });
