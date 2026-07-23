import { createServerFn } from "@tanstack/react-start";

const MP_BASE = "https://api.mercadopago.com";

export const getMpPublicKey = createServerFn({ method: "GET" }).handler(async () => {
  return { publicKey: process.env.MP_PUBLIC_KEY || "" };
});

type CriarPagInput = {
  pedido_id: string;
  transaction_amount: number;
  description: string;
  payer: { email: string; first_name?: string; identification?: { type: string; number: string } };
  // Cartão
  token?: string;
  payment_method_id?: string;
  installments?: number;
  issuer_id?: string;
  // Genérico
  metodo: "card" | "pix" | "bolbradesco";
  origin?: string;
};

function validate(i: unknown): CriarPagInput {
  if (!i || typeof i !== "object") throw new Error("Dados inválidos");
  const inp = i as CriarPagInput;
  if (!inp.pedido_id) throw new Error("Pedido obrigatório");
  if (!(inp.transaction_amount > 0)) throw new Error("Valor inválido");
  if (!inp.payer?.email) throw new Error("E-mail obrigatório");
  if (inp.metodo === "card" && (!inp.token || !inp.payment_method_id))
    throw new Error("Dados do cartão incompletos");
  return inp;
}

export const criarPagamentoMP = createServerFn({ method: "POST" })
  .validator((i: unknown) => validate(i))
  .handler(async ({ data }) => {
    const token = process.env.MP_ACCESS_TOKEN;
    if (!token) throw new Error("MP_ACCESS_TOKEN não configurado");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const body: any = {
      transaction_amount: Number(data.transaction_amount.toFixed(2)),
      description: data.description,
      external_reference: data.pedido_id,
      payer: data.payer,
      notification_url: data.origin ? `${data.origin.replace(/\/+$/, "")}/api/public/mp-webhook` : undefined,
    };

    if (data.metodo === "card") {
      body.token = data.token;
      body.payment_method_id = data.payment_method_id;
      body.installments = data.installments || 1;
      if (data.issuer_id) body.issuer_id = data.issuer_id;
      body.capture = true;
    } else if (data.metodo === "pix") {
      body.payment_method_id = "pix";
    } else if (data.metodo === "bolbradesco") {
      body.payment_method_id = "bolbradesco";
    }

    const idem = crypto.randomUUID();
    const res = await fetch(`${MP_BASE}/v1/payments`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": idem,
      },
      body: JSON.stringify(body),
    });

    const json: any = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("[MP] erro", res.status, json);
      throw new Error(json?.message || `Falha no pagamento (${res.status})`);
    }

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
