import { createFileRoute } from "@tanstack/react-router";
import { AdminPlaceholder } from "@/components/admin-placeholder";
import { MessageCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/configuracoes-whatsapp")({
  component: () => (
    <AdminPlaceholder title="Configurações do WhatsApp" description="Número de atendimento para receber pedidos." icon={MessageCircle} />
  ),
});
