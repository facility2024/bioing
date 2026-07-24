const MP_BASE = "https://api.mercadopago.com";

export type CriarPagInput = {
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
  token?: string;
  payment_method_id?: string;
  installments?: number;
  issuer_id?: string;
  metodo: "card" | "pix" | "bolbradesco";
  origin?: string;
};

type MercadoPagoError = {
  message?: string;
  error?: string;
  status?: number;
  cause?: Array<{ code?: string | number; description?: string; data?: string }>;
};

type MpUser = {
  id?: number | string;
  site_id?: string;
  country_id?: string;
  nickname?: string;
  status?: {
    sell?: { allow?: boolean; codes?: string[] };
    billing?: { allow?: boolean; codes?: string[] };
  };
  tags?: string[];
  identification?: { type?: string };
};

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

export function getMpErrorMessage(json: MercadoPagoError, fallbackStatus: number) {
  const cause = Array.isArray(json?.cause) && json.cause.length ? json.cause[0] : null;
  const rawMessage = `${json?.message || ""} ${cause?.description || ""}`;
  if (String(cause?.code) === "13253" || /Collector user without key enabled for QR render/i.test(rawMessage)) {
    return "O Mercado Pago recusou o PIX com o erro 13253 (QR render). A requisição enviada está no formato oficial; esse retorno vem da própria conta/token do Mercado Pago. Confirme com o suporte se o Access Token de produção salvo no app pertence exatamente ao vendedor habilitado para QR Code PIX dinâmico via API e peça validação usando o ID técnico do erro nos logs.";
  }
  return cause?.description || json?.message || json?.error || `Falha no pagamento (${fallbackStatus})`;
}

function hasQrRenderError(json: MercadoPagoError) {
  const cause = Array.isArray(json?.cause) && json.cause.length ? json.cause[0] : null;
  const rawMessage = `${json?.message || ""} ${cause?.description || ""}`;
  return String(cause?.code) === "13253" || /Collector user without key enabled for QR render/i.test(rawMessage);
}

function summarizeMercadoPagoError(json: MercadoPagoError) {
  const cause = Array.isArray(json?.cause) && json.cause.length ? json.cause[0] : null;
  return {
    status: json.status,
    error: json.error,
    message: json.message,
    causeCode: cause?.code,
    causeDescription: cause?.description,
    traceId: cause?.data,
  };
}

export async function diagnosticarContaMercadoPago(token: string, publicKey: string) {
  const res = await fetch(`${MP_BASE}/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const user = (await res.json().catch(() => ({}))) as MpUser & MercadoPagoError;
  if (!res.ok) {
    throw new Error(getMpErrorMessage(user, res.status));
  }

  return {
    isProductionToken: token.startsWith("APP_USR-"),
    hasPublicKey: Boolean(publicKey),
    isProductionPublicKey: publicKey ? publicKey.startsWith("APP_USR-") : null,
    userId: user.id ? String(user.id) : "",
    siteId: user.site_id || "",
    countryId: user.country_id || "",
    nickname: user.nickname || "",
    canSell: user.status?.sell?.allow === true,
    canBill: user.status?.billing?.allow === true,
    sellCodes: user.status?.sell?.codes || [],
    billingCodes: user.status?.billing?.codes || [],
    accountDocumentType: user.identification?.type || "",
    accountTags: Array.isArray(user.tags) ? user.tags.slice(0, 12) : [],
  };
}

export function montarPagamentoMercadoPago(data: CriarPagInput) {
  const amount = normalizeAmount(data.transaction_amount);
  const email = data.payer.email.trim().toLowerCase();
  const documentNumber = onlyDigits(data.payer.identification?.number || "");
  const notificationUrl = data.origin ? `${data.origin.replace(/\/+$/, "")}/api/public/mp-webhook` : undefined;
  const firstName = stripAccents(data.payer.first_name || "");
  const lastName = stripAccents(data.payer.last_name || "");

  const payer: Record<string, unknown> = {
    email,
    entity_type: "individual",
    first_name: firstName || "Cliente",
    last_name: lastName || "Silva",
  };
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

  const body: Record<string, unknown> = {
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
    // Payload oficial do Checkout API PIX: valor, descrição, método e payer com CPF/endereço.
    // Evita campos opcionais que podem acionar validações inconsistentes de QR render.
    body.payment_method_id = "pix";
  } else if (data.metodo === "bolbradesco") {
    body.payment_method_id = "bolbradesco";
  }

  return body;
}

export async function criarPagamentoMercadoPago(token: string, body: Record<string, unknown>) {
  const res = await fetch(`${MP_BASE}/v1/payments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": crypto.randomUUID(),
    },
    body: JSON.stringify(body),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("[MP] erro", res.status, JSON.stringify(summarizeMercadoPagoError(json)));
    if (hasQrRenderError(json)) {
      const diag = await diagnosticarContaMercadoPago(token, "").catch((error) => ({
        diagnosticoFalhou: error instanceof Error ? error.message : "Erro desconhecido",
      }));
      console.error("[MP] diagnostico 13253", JSON.stringify(diag));
    }
    throw new Error(getMpErrorMessage(json, res.status));
  }
  return json;
}