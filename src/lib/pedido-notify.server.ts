import { supabaseAdmin } from "@/integrations/supabase/client.server";

const WAPI_BASE = "https://api.w-api.app/v1";

function onlyDigits(s: string) {
  return (s || "").replace(/\D/g, "");
}
function formatBRL(n: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
}
function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
function whatsappPhoneCandidates(phone: string) {
  const digits = onlyDigits(phone);
  const list: string[] = [];
  if (digits.startsWith("55") && digits.length === 12) list.push(`${digits.slice(0, 4)}9${digits.slice(4)}`);
  if (digits.length >= 10) list.push(digits);
  return [...new Set(list)];
}

/**
 * Envia PDF + WhatsApp para o pedido já pago.
 * Idempotente: se pedido já tem status 'pago_notificado', não repete.
 */
export async function notificarPedido(pedidoId: string, origin?: string) {
  const { data: pedido, error } = await supabaseAdmin
    .from("pedidos")
    .select(
      "id, numero, total, subtotal, frete_valor, frete_servico, observacoes, status, cliente_id"
    )
    .eq("id", pedidoId)
    .maybeSingle();
  if (error || !pedido) {
    console.error("[notify] pedido não encontrado", pedidoId);
    return;
  }
  if (pedido.status === "pago_notificado") return;

  const { data: cliente } = await supabaseAdmin
    .from("clientes")
    .select("nome, whatsapp, email")
    .eq("id", pedido.cliente_id)
    .maybeSingle();
  if (!cliente) return;

  const { data: itens } = await supabaseAdmin
    .from("itens_pedido")
    .select("produto_id, produto_nome, quantidade, valor_unitario, valor_total")
    .eq("pedido_id", pedido.id);

  const itensArr = (itens || []).map((it) => ({
    id: it.produto_id || undefined,
    nome: it.produto_nome as string,
    preco: Number(it.valor_unitario),
    quantidade: Number(it.quantidade),
  }));

  // Abate estoque agora (após pagamento confirmado)
  const abatidos: string[] = [];
  for (const it of itensArr) {
    if (!it.id) continue;
    await supabaseAdmin.rpc("abater_estoque", { _produto_id: it.id, _quantidade: it.quantidade });
    abatidos.push(it.id);
  }

  // Gera PDF
  let pdfUrl: string | null = null;
  try {
    const { gerarESalvarPedidoPdf } = await import("@/lib/pedido-pdf.server");
    const signed = await gerarESalvarPedidoPdf({
      numero: pedido.numero,
      cliente: {
        nome: cliente.nome,
        telefone: cliente.whatsapp || "",
        email: cliente.email || undefined,
        observacoes: pedido.observacoes || undefined,
      },
      itens: itensArr,
      total: Number(pedido.total),
    });
    if (signed) {
      const o = (origin || "").replace(/\/+$/, "");
      pdfUrl = o ? `${o}/api/public/pedido/${encodeURIComponent(pedido.numero)}.pdf` : signed;
    }
  } catch (e) {
    console.error("[notify] PDF falhou:", e);
  }

  // Marca como notificado
  await supabaseAdmin.from("pedidos").update({ status: "pago_notificado" }).eq("id", pedido.id);

  // WhatsApp
  const { data: config } = await supabaseAdmin
    .from("configuracoes_whatsapp")
    .select("instance_id, api_token, numero_conectado, numero_alerta_estoque, ativa")
    .limit(1)
    .maybeSingle();

  if (!config?.instance_id || !config?.api_token || !config?.numero_conectado) {
    console.warn("[notify] WhatsApp não configurado");
    return;
  }

  const itensTxt = itensArr
    .map((it) => `• ${it.quantidade}x ${it.nome} — ${formatBRL(it.preco * it.quantidade)}`)
    .join("\n");

  const rodape =
    `\n\n━━━━━━━━━━━━━━━\n*BIOCON DO BRASIL PRODUTOS E SERVICOS LTDA - ME*\n` +
    `CNPJ: 51.909.772/0001-81\nEndereço: R. São Bartolomeu, 785 - Vila San Martin, Sumaré - SP\n` +
    `✉️ vendas@biocondobrasil.com.br`;
  const linhaPdf = pdfUrl ? `\n\n📄 *PDF do pedido:* ${pdfUrl}` : "";
  const linhaFrete = pedido.frete_valor
    ? `\n🚚 *Frete (${pedido.frete_servico || "envio"}):* ${formatBRL(Number(pedido.frete_valor))}`
    : "";

  const dadosCli =
    `👤 *Cliente:* ${cliente.nome}\n📱 *WhatsApp:* ${cliente.whatsapp}\n` +
    (cliente.email ? `✉️ ${cliente.email}\n` : "") +
    (pedido.observacoes ? `📝 ${pedido.observacoes}\n` : "");

  const msgAtendente =
    `🛒 *Pedido pago ${pedido.numero}* ✅\n\n${dadosCli}\n*Itens:*\n${itensTxt}${linhaFrete}\n\n` +
    `💰 *Total:* ${formatBRL(Number(pedido.total))}${linhaPdf}${rodape}`;
  const msgCliente =
    `Olá *${cliente.nome}*! 👋\n\nSeu pagamento do pedido *${pedido.numero}* foi aprovado! ✅\n\n` +
    `*Resumo:*\n${itensTxt}${linhaFrete}\n\n💰 *Total:* ${formatBRL(Number(pedido.total))}` +
    `${linhaPdf}\n\nEm breve entraremos em contato para combinar a entrega. 🚀${rodape}`;

  async function enviar(phone: string, message: string) {
    const url = `${WAPI_BASE}/message/send-text?instanceId=${encodeURIComponent(config!.instance_id!)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${config!.api_token!}` },
      body: JSON.stringify({ phone: onlyDigits(phone), message, delayMessage: 1 }),
    });
    const j: any = await res.json().catch(() => ({}));
    if (!res.ok || j?.error) throw new Error(j?.message || `HTTP ${res.status}`);
  }

  await sleep(8000);
  await Promise.allSettled([
    enviar(config.numero_conectado, msgAtendente),
    enviar(cliente.whatsapp || "", msgCliente),
  ]);

  // Alerta de estoque baixo
  if (abatidos.length > 0) {
    const { data: baixos } = await supabaseAdmin
      .from("produtos")
      .select("id, nome, estoque")
      .in("id", abatidos)
      .eq("controla_estoque", true)
      .eq("ativo", true)
      .eq("notificado_estoque_baixo", false)
      .lte("estoque", 3);
    if (baixos && baixos.length) {
      await sleep(15000);
      const destino = (config as any).numero_alerta_estoque || config.numero_conectado;
      for (const p of baixos) {
        const msg =
          `🚨 *Olá, Operador/Admin!*\n\n📦 Estoque do produto *${p.nome}* está baixo.\n\n` +
          `⚠️ Restam *${p.estoque} unidades*.`;
        for (const phone of whatsappPhoneCandidates(destino)) {
          try {
            await enviar(phone, msg);
            await supabaseAdmin
              .from("produtos")
              .update({ notificado_estoque_baixo: true })
              .eq("id", p.id);
            break;
          } catch (e) {
            console.error("[notify] alerta estoque falhou", e);
          }
        }
      }
    }
  }
}
