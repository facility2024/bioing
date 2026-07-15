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

    const mensagemAtendente =
      `🛒 *Novo pedido recebido!*\n\n` +
      `👤 *Cliente:* ${data.cliente.nome}\n` +
      `📱 *Telefone:* ${data.cliente.telefone}\n` +
      (data.cliente.email ? `✉️ *E-mail:* ${data.cliente.email}\n` : "") +
      (enderecoTxt ? `📍 *Endereço:* ${enderecoTxt}\n` : "") +
      (data.cliente.observacoes ? `📝 *Obs:* ${data.cliente.observacoes}\n` : "") +
      `\n*Itens:*\n${itensTxt}\n\n` +
      `💰 *Total:* ${formatBRL(data.total)}`;

    const mensagemCliente =
      `Olá *${data.cliente.nome}*! 👋\n\n` +
      `Recebemos seu pedido com sucesso! ✅\n\n` +
      `*Resumo do pedido:*\n${itensTxt}\n\n` +
      `💰 *Total:* ${formatBRL(data.total)}\n\n` +
      `Um atendente já está com sua solicitação e vai continuar por aqui mesmo pelo WhatsApp. 🚀\n` +
      `Fique à vontade, ele já está pronto para te atender!`;

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

    return { ok: true };
  });
