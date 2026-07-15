import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Trash2, MessageCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/clientes")({
  component: ClientesAdmin,
});

type Cliente = {
  id: string;
  nome: string;
  whatsapp: string;
  email: string | null;
  created_at: string;
};

function ClientesAdmin() {
  const qc = useQueryClient();

  const { data: clientes, isLoading } = useQuery({
    queryKey: ["admin-clientes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clientes")
        .select("id, nome, whatsapp, email, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Cliente[];
    },
  });

  const { data: pedidosCount } = useQuery({
    queryKey: ["admin-clientes-pedidos-count"],
    queryFn: async () => {
      const { data, error } = await supabase.from("pedidos").select("cliente_id");
      if (error) throw error;
      const m = new Map<string, number>();
      (data ?? []).forEach((r: any) => m.set(r.cliente_id, (m.get(r.cliente_id) ?? 0) + 1));
      return m;
    },
  });

  const excluir = async (c: Cliente) => {
    if (!confirm(`Excluir cliente "${c.nome}"? Isso removerá também seus pedidos.`)) return;
    await supabase.from("pedidos").delete().eq("cliente_id", c.id);
    const { error } = await supabase.from("clientes").delete().eq("id", c.id);
    if (error) return toast.error(error.message);
    toast.success("Cliente excluído");
    qc.invalidateQueries({ queryKey: ["admin-clientes"] });
    qc.invalidateQueries({ queryKey: ["admin-clientes-pedidos-count"] });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Clientes</h2>
        <p className="text-sm text-muted-foreground">
          Cadastrados automaticamente ao finalizar o formulário de checkout.
        </p>
      </div>

      {isLoading ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Carregando...</CardContent></Card>
      ) : !clientes || clientes.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center space-y-3">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-muted text-muted-foreground">
              <Users className="h-6 w-6" />
            </div>
            <p className="text-sm text-muted-foreground">Nenhum cliente cadastrado ainda.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {clientes.map((c) => (
            <Card key={c.id}>
              <CardContent className="p-4 flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 grid place-items-center text-primary font-semibold shrink-0">
                  {c.nome.slice(0, 1).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{c.nome}</p>
                  <p className="text-sm text-muted-foreground truncate">{c.whatsapp}</p>
                  {c.email && <p className="text-xs text-muted-foreground truncate">{c.email}</p>}
                  <p className="text-xs text-muted-foreground mt-1">
                    {pedidosCount?.get(c.id) ?? 0} pedido(s) · desde {new Date(c.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <div className="flex flex-col gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    asChild
                  >
                    <a href={`https://wa.me/${c.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">
                      <MessageCircle className="h-4 w-4" />
                    </a>
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => excluir(c)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
