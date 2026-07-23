import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/mp-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const type = url.searchParams.get("type") || url.searchParams.get("topic");
          const body = await request.json().catch(() => ({} as any));

          const paymentId =
            body?.data?.id ||
            body?.resource?.split?.("/")?.pop?.() ||
            url.searchParams.get("id") ||
            url.searchParams.get("data.id");

          if (type && !["payment", "payments"].includes(type)) {
            return new Response("ignored", { status: 200 });
          }
          if (!paymentId) return new Response("no id", { status: 200 });

          const token = process.env.MP_ACCESS_TOKEN;
          if (!token) return new Response("no token", { status: 500 });

          const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) return new Response("mp fetch fail", { status: 200 });
          const pay: any = await res.json();

          const pedidoId = pay.external_reference;
          if (!pedidoId) return new Response("no ref", { status: 200 });

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          await supabaseAdmin
            .from("pedidos")
            .update({
              pagamento_status: pay.status,
              pagamento_id: String(pay.id),
              pagamento_metodo: pay.payment_method_id,
            })
            .eq("id", pedidoId);

          if (pay.status === "approved") {
            const { notificarPedido } = await import("@/lib/pedido-notify.server");
            await notificarPedido(pedidoId).catch((e) =>
              console.error("[mp-webhook] notificar falhou:", e)
            );
          }

          return new Response("ok", { status: 200 });
        } catch (e) {
          console.error("[mp-webhook] erro", e);
          return new Response("err", { status: 200 });
        }
      },
    },
  },
});
