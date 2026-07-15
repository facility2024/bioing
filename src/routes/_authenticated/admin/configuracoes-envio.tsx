import { createFileRoute } from "@tanstack/react-router";
import { AdminPlaceholder } from "@/components/admin-placeholder";
import { Truck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/configuracoes-envio")({
  component: () => (
    <AdminPlaceholder title="Configurações de Envio" description="Tempo de delay antes de enviar o pedido ao WhatsApp." icon={Truck} />
  ),
});
