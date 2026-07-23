import { createServerFn } from "@tanstack/react-start";

const MP_BASE = "https://api.mercadopago.com";

export const getMpPublicKey = createServerFn({ method: "GET" }).handler(async () => {
  return { publicKey: process.env.MP_PUBLIC_KEY || "" };
});

type CriarPagInput = {
  pedido_id: string;
  transaction_amount: number;
  description: string;
  payer: {
    email: string;
    first_name?: string;
    last_name?: string;
    identification?: { type: string; number: string };
    address?: {
      zip_code?: string;
      street_name?: string;
      street_number?: string;
      neighborhood?: string;
      city?: string;
      federal_unit?: string;
    };
  };
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

function cleanAddressText(s: string) {
  return (s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9\s.,'/-]/g, "")
    .trim();
}

function normalizeAmount(value: number) {
  return Number(Number(value || 0).toFixed(2));
}

function getMpErrorMessage(json: MercadoPagoError, fallbackStatus: number) {
  const cause = Array.isArray(json?.cause) && json.cause.length ? json.cause[0] : null;
  const rawMessage = `${json?.message || ""} ${cause?.description || ""}`;
  if (String(cause?.code) === "13253" || /Collector user without key enabled for QR render/i.test(rawMessage)) {
    return "A conta vendedora do Mercado Pago ligada ao MP_ACCESS_TOKEN ainda não tem chave PIX habilitada para gerar QR Code. Ative/cadastre uma chave PIX nessa conta e salve o Access Token de produção dessa mesma conta.";
  }
  return cause?.description || json?.message || json?.error || `Falha no pagamento (${fallbackStatus})`;
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

    const payer: any = { email, entity_type: "individual" };
    payer.first_name = firstName || "Cliente";
    payer.last_name = lastName || "Silva";
    if (documentNumber.length === 11) {
      payer.identification = { type: "CPF", number: documentNumber };
    }
    const address = data.payer.address;
    const addressPayload = {
      zip_code: onlyDigits(address?.zip_code || ""),
      street_name: cleanAddressText(address?.street_name || ""),
      street_number: cleanAddressText(address?.street_number || ""),
      neighborhood: cleanAddressText(address?.neighborhood || ""),
      city: cleanAddressText(address?.city || ""),
      federal_unit: cleanAddressText(address?.federal_unit || "").slice(0, 2).toUpperCase(),
    };
    if (
      addressPayload.zip_code.length === 8 &&
      addressPayload.street_name &&
      addressPayload.street_number &&
      addressPayload.neighborhood &&
      addressPayload.city &&
      addressPayload.federal_unit.length === 2
    ) {
      payer.address = addressPayload;
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
      const exp = new Date(Date.now() + 30 * 60 * 1000);
      body.date_of_expiration = exp.toISOString().replace("Z", "-00:00");
    } else if (data.metodo === "bolbradesco") {
      body.payment_method_id = "bolbradesco";
    }

    const res = await fetch(`${MP_BASE}/v1/payments`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": crypto.randomUUID(),
      },
      body: JSON.stringify(body),
    });

    const json: any = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("[MP] erro", res.status, JSON.stringify(json));
      throw new Error(getMpErrorMessage(json, res.status));
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
