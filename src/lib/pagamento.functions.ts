import { createServerFn } from "@tanstack/react-start";

const MP_BASE = "https://api.mercadopago.com";

export const getMpPublicKey = createServerFn({ method: "GET" }).handler(async () => {
  return { publicKey: process.env.MP_PUBLIC_KEY || "" };
});

type CriarPagInput = {
  pedido_id: string;
  transaction_amount: number;
  description: string;
  payer: { email: string; first_name?: string; last_name?: string; identification?: { type: string; number: string } };
  // Cartão
  token?: string;
  payment_method_id?: string;
  installments?: number;
  issuer_id?: string;
  // Genérico
  metodo: "card" | "pix" | "bolbradesco";
  origin?: string;
};

type MercadoPagoError = {
  message?: string;
  error?: string;
  status?: number;
  cause?: Array<{ code?: string | number; description?: string }>;
};

function validate(i: unknown): CriarPagInput {
  if (!i || typeof i !== "object") throw new Error("Dados inválidos");
  const inp = i as CriarPagInput;
  if (!inp.pedido_id) throw new Error("Pedido obrigatório");
  if (!(inp.transaction_amount > 0)) throw new Error("Valor inválido");
  if (!inp.payer?.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inp.payer.email.trim())) {
    throw new Error("E-mail obrigatório para o pagamento");
  }
  if (inp.metodo !== "card" && onlyDigits(inp.payer.identification?.number || "").length !== 11) {
    throw new Error("CPF obrigatório para PIX/boleto");
  }
  if (inp.metodo === "card" && (!inp.token || !inp.payment_method_id))
    throw new Error("Dados do cartão incompletos");
  return inp;
}

function onlyDigits(s: string) {
  return (s || "").replace(/\D/g, "");
}

function stripAccents(s: string) {
  return (s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z\s'-]/g, "")
    .trim();
}

function normalizeAmount(value: number) {
  return Number(Number(value || 0).toFixed(2));
}

function getMpErrorMessage(json: MercadoPagoError, fallbackStatus: number) {
  const cause = Array.isArray(json?.cause) && json.cause.length ? json.cause[0] : null;
  return cause?.description || json?.message || json?.error || `Falha no pagamento (${fallbackStatus})`;
}

function isFinancialIdentityError(message: string) {
  return /financial identity/i.test(message);
}

export const criarPagamentoMP = createServerFn({ method: "POST" })
  .validator((i: unknown) => validate(i))
  .handler(async ({ data }) => {
    const token = process.env.MP_ACCESS_TOKEN;
    if (!token) throw new Error("MP_ACCESS_TOKEN não configurado");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const amount = normalizeAmount(data.transaction_amount);
    const email = data.payer.email.trim().toLowerCase();
    const documentNumber = onlyDigits(data.payer.identification?.number || "");
    const notificationUrl = data.origin ? `${data.origin.replace(/\/+$/, "")}/api/public/mp-webhook` : undefined;
    const firstName = stripAccents(data.payer.first_name || "");
    const lastName = stripAccents(data.payer.last_name || "");

    const payer: any = {
      email,
    };
    // Para PIX/boleto o Mercado Pago pode rejeitar quando nome/sobrenome não batem
    // com o CPF ("Financial Identity"). Enviamos o formato oficial mínimo: e-mail + CPF.
    if (data.metodo === "card") {
      payer.first_name = firstName || "Cliente";
      payer.last_name = lastName || "Silva";
    }
    if (data.payer.identification?.number) {
      payer.identification = {
        type: data.payer.identification.type || "CPF",
        number: documentNumber,
      };
    }

    const body: any = {
      transaction_amount: amount,
      description: data.description,
      external_reference: data.pedido_id,
      payer,
      notification_url: notificationUrl,
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

    const createPayment = async (payload: any) => fetch(`${MP_BASE}/v1/payments`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": crypto.randomUUID(),
      },
      body: JSON.stringify(payload),
    });

    const createPreferenceFallback = async () => {
      const prefBody: any = {
        items: [
          {
            title: data.description || "Pedido",
            quantity: 1,
            currency_id: "BRL",
            unit_price: amount,
          },
        ],
        payer: { email },
        external_reference: data.pedido_id,
        notification_url: notificationUrl,
        payment_methods: {
          excluded_payment_types: [
            { id: "credit_card" },
            { id: "debit_card" },
            { id: "ticket" },
          ],
          installments: 1,
        },
      };
      if (data.origin) {
        const base = data.origin.replace(/\/+$/, "");
        prefBody.back_urls = {
          success: `${base}/`,
          failure: `${base}/`,
          pending: `${base}/`,
        };
      }

      const prefRes = await fetch(`${MP_BASE}/checkout/preferences`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(prefBody),
      });
      const prefJson: any = await prefRes.json().catch(() => ({}));
      if (!prefRes.ok) {
        console.error("[MP] fallback preference erro", prefRes.status, prefJson);
        throw new Error(getMpErrorMessage(prefJson, prefRes.status));
      }

      await supabaseAdmin
        .from("pedidos")
        .update({
          mp_preference_id: prefJson.id ? String(prefJson.id) : null,
          pagamento_status: "pendente",
          pagamento_metodo: "pix",
        })
        .eq("id", data.pedido_id);

      return {
        status: "pending",
        status_detail: "checkout_link",
        id: prefJson.id ? String(prefJson.id) : "",
        pix: null,
        checkout_url: (prefJson.init_point || prefJson.sandbox_init_point || "") as string,
      };
    };

    const res = await createPayment(body);

    const json: any = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("[MP] erro", res.status, json);
      const message = getMpErrorMessage(json, res.status);
      if (data.metodo === "pix" && isFinancialIdentityError(message)) {
        return createPreferenceFallback();
      }
      throw new Error(message);
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
      checkout_url: null,
    };
  });
