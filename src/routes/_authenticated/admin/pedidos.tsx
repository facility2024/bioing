import { createFileRoute } from "@tanstack/react-router";
import { AdminPlaceholder } from "@/components/admin-placeholder";
import { ShoppingCart } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/pedidos")({
  component: () => (
    <AdminPlaceholder title="Pedidos" description="Acompanhe e gerencie todos os pedidos." icon={ShoppingCart} />
  ),
});
