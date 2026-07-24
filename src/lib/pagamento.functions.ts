import { createServerFn } from "@tanstack/react-start";
import {
  criarPagamentoMercadoPago,
  diagnosticarContaMercadoPago,
  montarPagamentoMercadoPago,
  type CriarPagInput,
} from "./pagamento.server";

export const getMpPublicKey = createServerFn({ method: "GET" }).handler(async () => {
  return { publicKey: process.env.MP_PUBLIC_KEY || "" };
});

export const diagnosticarMercadoPago = createServerFn({ method: "GET" }).handler(async () => {
  const token = process.env.MP_ACCESS_TOKEN;
  const publicKey = process.env.MP_PUBLIC_KEY || "";
  if (!token) throw new Error("MP_ACCESS_TOKEN não configurado");
  return diagnosticarContaMercadoPago(token, publicKey);
});


export const criarPagamentoMP = createServerFn({ method: "POST" })
  .validator((i: unknown) => {
    if (!i || typeof i !== "object") throw new Error("Dados inválidos");
    const inp = i as CriarPagInput;
    if (!inp.pedido_id) throw new Error("Pedido obrigatório");
    if (!(inp.transaction_amount > 0)) throw new Error("Valor inválido");
    if (!inp.payer?.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inp.payer.email.trim())) {
      throw new Error("E-mail obrigatório para o pagamento");
    }
    const cpf = (inp.payer.identification?.number || "").replace(/\D/g, "");
    if (inp.metodo !== "card" && cpf.length !== 11) {
      throw new Error("CPF obrigatório para PIX/boleto");
    }
    if (inp.metodo === "card" && (!inp.token || !inp.payment_method_id)) {
      throw new Error("Dados do cartão incompletos");
    }
    return inp;
  })
  .handler(async ({ data }) => {
    const token = process.env.MP_ACCESS_TOKEN;
    if (!token) throw new Error("MP_ACCESS_TOKEN não configurado");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const body = montarPagamentoMercadoPago(data);
    const json = await criarPagamentoMercadoPago(token, body);


    // Persiste no pedido
    await supabaseAdmin
      .from("pedidos")
      .update({
        pagamento_id: String(json.id),
        pagamento_status: json.status || "pendente",
        pagamento_metodo: json.payment_method_id || data.metodo,
      })
      .eq("id", data.pedido_id);

    // Se aprovado imediatamente (cartão) → dispara notificações
    if (json.status === "approved") {
      const { notificarPedido } = await import("@/lib/pedido-notify.server");
      notificarPedido(data.pedido_id, data.origin).catch((e) =>
        console.error("[pagamento] notificar falhou:", e)
      );
    }

    return {
      status: json.status as string,
      status_detail: json.status_detail as string,
      id: String(json.id),
      pix:
        json.point_of_interaction?.transaction_data
          ? {
              qr_code: json.point_of_interaction.transaction_data.qr_code as string,
              qr_code_base64: json.point_of_interaction.transaction_data.qr_code_base64 as string,
              ticket_url: json.point_of_interaction.transaction_data.ticket_url as string,
            }
          : null,
    };
  });
