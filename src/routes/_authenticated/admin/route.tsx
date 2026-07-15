import { createFileRoute, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin-sidebar";
import { supabase } from "@/integrations/supabase/client";

const adminCache = new Map<string, boolean>();

export const Route = createFileRoute("/_authenticated/admin")({
  ssr: false,
  beforeLoad: async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;
    if (!user) throw redirect({ to: "/auth" });

    let isAdmin = adminCache.get(user.id);
    if (isAdmin === undefined) {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      isAdmin = !!roles;
      adminCache.set(user.id, isAdmin);
    }

    if (!isAdmin) throw redirect({ to: "/", search: {} as never });
    return { user };
  },
  component: AdminLayout,
});

function AdminLayout() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const title = getTitleFromPath(pathname);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-muted/20">
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center gap-3 border-b bg-background px-4 sticky top-0 z-10">
            <SidebarTrigger />
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold">{title}</h1>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6 overflow-x-hidden">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function getTitleFromPath(path: string) {
  if (path.includes("/dashboard")) return "Dashboard";
  if (path.includes("/produtos")) return "Produtos";
  if (path.includes("/categorias")) return "Categorias";
  if (path.includes("/pedidos")) return "Pedidos";
  if (path.includes("/clientes")) return "Clientes";
  if (path.includes("/slides")) return "Slides do topo";
  if (path.includes("/configuracoes-loja")) return "Configurações da Loja";
  if (path.includes("/configuracoes-whatsapp")) return "Configurações do WhatsApp";
  if (path.includes("/configuracoes-envio")) return "Configurações de Envio";
  return "Painel";
}
