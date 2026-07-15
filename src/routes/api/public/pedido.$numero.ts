import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/pedido/$numero")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const numero = String(params.numero || "").replace(/\.pdf$/i, "");
        if (!/^[A-Za-z0-9._-]+$/.test(numero)) {
          return new Response("Pedido inválido", { status: 400 });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const path = `${numero}.pdf`;
        const { data, error } = await supabaseAdmin.storage
          .from("pedidos-pdf")
          .createSignedUrl(path, 60 * 60);
        if (error || !data?.signedUrl) {
          return new Response("Pedido não encontrado", { status: 404 });
        }
        return new Response(null, {
          status: 302,
          headers: {
            Location: data.signedUrl,
            "Cache-Control": "no-store",
          },
        });
      },
    },
  },
});
