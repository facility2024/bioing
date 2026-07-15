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
  origin?: string;
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
  .validator((input: unknown) => validate(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const itensTxt = data.itens
      .map((it) => `• ${it.quantidade}x ${it.nome} — ${formatBRL(it.preco * it.quantidade)}`)
      .join("\n");

    const enderecoTxt = [data.cliente.endereco, data.cliente.cidade, data.cliente.cep]
      .filter(Boolean)
      .join(" - ");

    // ============ 1) PERSISTIR CLIENTE + PEDIDO + ITENS (SEMPRE) ============
    const telDigits = onlyDigits(data.cliente.telefone);
    let pedidoNumero: string | null = null;

    try {
      const { data: existente, error: errBusca } = await supabaseAdmin
        .from("clientes")
        .select("id")
        .eq("whatsapp", telDigits)
        .maybeSingle();
      if (errBusca) throw new Error(`Erro ao buscar cliente: ${errBusca.message}`);

      let clienteId = existente?.id as string | undefined;
      if (clienteId) {
        const { error: errUp } = await supabaseAdmin
          .from("clientes")
          .update({ nome: data.cliente.nome, email: data.cliente.email ?? null })
          .eq("id", clienteId);
        if (errUp) throw new Error(`Erro ao atualizar cliente: ${errUp.message}`);
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
        if (errCli) throw new Error(`Erro ao criar cliente: ${errCli.message}`);
        clienteId = novo!.id;
      }

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
          subtotal: data.total,
          total: data.total,
          status: "novo",
          observacoes,
        })
        .select("id, numero")
        .single();
      if (errPed) throw new Error(`Erro ao criar pedido: ${errPed.message}`);
      pedidoNumero = pedido!.numero as string;

      const itensPayload = data.itens.map((it) => ({
        pedido_id: pedido!.id,
        produto_nome: it.nome,
        quantidade: it.quantidade,
        valor_unitario: it.preco,
        valor_total: it.preco * it.quantidade,
      }));
      const { error: errItens } = await supabaseAdmin.from("itens_pedido").insert(itensPayload);
      if (errItens) throw new Error(`Erro ao criar itens: ${errItens.message}`);
    } catch (e) {
      console.error("[checkout] Falha ao registrar pedido:", e);
      throw new Error(
        e instanceof Error ? e.message : "Não foi possível registrar seu pedido. Tente novamente."
      );
    }

    // ============ 2) GERAR PDF DO PEDIDO (link substitui o cupom) ============
    let pdfUrl: string | null = null;
    if (pedidoNumero) {
      try {
        const { gerarESalvarPedidoPdf } = await import("@/lib/pedido-pdf.server");
        pdfUrl = await gerarESalvarPedidoPdf({
          numero: pedidoNumero,
          cliente: data.cliente,
          itens: data.itens,
          total: data.total,
        });
      } catch (e) {
        console.error("[checkout] Falha ao gerar PDF (não bloqueia pedido):", e);
      }
    }

    // ============ 3) TENTAR ENVIAR WHATSAPP (não bloqueia o pedido) ============
    const { data: config } = await supabaseAdmin
      .from("configuracoes_whatsapp")
      .select("instance_id, api_token, numero_conectado, ativa")
      .limit(1)
      .maybeSingle();

    const rodapeEmpresa =
      `\n\n━━━━━━━━━━━━━━━\n` +
      `*BIOCON DO BRASIL PRODUTOS E SERVICOS LTDA - ME*\n` +
      `CNPJ: 51.909.772/0001-81\n` +
      `Endereço: R. São Bartolomeu, 785 - Vila San Martin, Sumaré - SP, 13180-310\n` +
      `✉️ *E-mail:* vendas@biocondobrasil.com.br`;

    const linhaPdf = pdfUrl
      ? `\n\n📄 *Link do PDF do pedido:*\n${pdfUrl}\n\nClique no link acima para abrir ou baixar o comprovante.`
      : "";

    const mensagemAtendente =
      `🛒 *Novo pedido ${pedidoNumero ?? ""}*\n\n` +
      `👤 *Cliente:* ${data.cliente.nome}\n` +
      `📱 *Telefone:* ${data.cliente.telefone}\n` +
      (data.cliente.email ? `✉️ *E-mail:* ${data.cliente.email}\n` : "") +
      (enderecoTxt ? `📍 *Endereço:* ${enderecoTxt}\n` : "") +
      (data.cliente.observacoes ? `📝 *Obs:* ${data.cliente.observacoes}\n` : "") +
      `\n*Itens:*\n${itensTxt}\n\n` +
      `💰 *Total:* ${formatBRL(data.total)}` +
      linhaPdf +
      rodapeEmpresa;

    const mensagemCliente =
      `Olá *${data.cliente.nome}*! 👋\n\n` +
      `Recebemos seu pedido *${pedidoNumero ?? ""}* com sucesso! ✅\n\n` +
      `*Resumo do pedido:*\n${itensTxt}\n\n` +
      `💰 *Total:* ${formatBRL(data.total)}` +
      linhaPdf +
      `\n\nUm atendente já está com sua solicitação e vai continuar por aqui mesmo pelo WhatsApp. 🚀` +
      rodapeEmpresa;

    if (config?.instance_id && config?.api_token && config?.numero_conectado) {
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
      try {
        await enviar(config.numero_conectado, mensagemAtendente);
        await enviar(data.cliente.telefone, mensagemCliente);
      } catch (e) {
        console.error("[checkout] WhatsApp falhou (pedido já salvo):", e);
      }
    } else {
      console.warn("[checkout] WhatsApp não configurado — pedido salvo sem notificação.");
    }

    return { ok: true, numero: pedidoNumero, pdfUrl };
  });

