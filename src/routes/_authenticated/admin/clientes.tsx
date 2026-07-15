import { createFileRoute } from "@tanstack/react-router";
import { AdminPlaceholder } from "@/components/admin-placeholder";
import { Users } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/clientes")({
  component: () => (
    <AdminPlaceholder title="Clientes" description="Base de clientes cadastrados." icon={Users} />
  ),
});
