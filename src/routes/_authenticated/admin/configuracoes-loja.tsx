import { createFileRoute } from "@tanstack/react-router";
import { AdminPlaceholder } from "@/components/admin-placeholder";
import { Store } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/configuracoes-loja")({
  component: () => (
    <AdminPlaceholder title="Configurações da Loja" description="Nome, logo e informações da empresa." icon={Store} />
  ),
});
