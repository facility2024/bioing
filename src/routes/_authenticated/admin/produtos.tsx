import { createFileRoute } from "@tanstack/react-router";
import { AdminPlaceholder } from "@/components/admin-placeholder";
import { Package } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/produtos")({
  component: () => (
    <AdminPlaceholder title="Produtos" description="Cadastro e gerenciamento de produtos." icon={Package} />
  ),
});
