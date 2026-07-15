import { createFileRoute } from "@tanstack/react-router";
import { AdminPlaceholder } from "@/components/admin-placeholder";
import { Tags } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/categorias")({
  component: () => (
    <AdminPlaceholder title="Categorias" description="Organize seus produtos em categorias." icon={Tags} />
  ),
});
