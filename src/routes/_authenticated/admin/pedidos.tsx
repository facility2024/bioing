import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ShoppingCart, Eye, Trash2 } from "lucide-react";
import { formatBRL } from "@/hooks/use-cart";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/pedidos")({
  component: PedidosAdmin,
});

type Pedido = {
  id: string;
  numero: string;
  status: string;
  total: number;
  observacoes: string | null;
  created_at: string;
  clientes: { nome: string; whatsapp: string; email: string | null } | null;
};

type Item = {
  id: string;
  produto_nome: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
};

const STATUS = ["novo", "em_atendimento", "concluido", "cancelado"];

const statusLabel: Record<string, string> = {
  novo: "Novo",
  em_atendimento: "Em atendimento",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  novo: "default",
  em_atendimento: "secondary",
  concluido: "outline",
  cancelado: "destructive",
};

const PAGE_SIZE = 10;

function PedidosAdmin() {
  const qc = useQueryClient();
  const [sel, setSel] = useState<Pedido | null>(null);
  const [page, setPage] = useState(1);

  const { data: pedidos, isLoading } = useQuery({
    queryKey: ["admin-pedidos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pedidos")
        .select("id, numero, status, total, observacoes, created_at, clientes(nome, whatsapp, email)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Pedido[];
    },
  });

  const { data: itens } = useQuery({
    queryKey: ["admin-pedido-itens", sel?.id],
    enabled: !!sel?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("itens_pedido")
        .select("id, produto_nome, quantidade, valor_unitario, valor_total")
        .eq("pedido_id", sel!.id);
      if (error) throw error;
      return data as Item[];
    },
  });

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("pedidos").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Status atualizado");
    qc.invalidateQueries({ queryKey: ["admin-pedidos"] });
  };

  const excluir = async (id: string) => {
    if (!confirm("Excluir este pedido?")) return;
    await supabase.from("itens_pedido").delete().eq("pedido_id", id);
    const { error } = await supabase.from("pedidos").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Pedido excluído");
    qc.invalidateQueries({ queryKey: ["admin-pedidos"] });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Pedidos</h2>
        <p className="text-sm text-muted-foreground">
          Pedidos registrados automaticamente ao finalizar o checkout via WhatsApp.
        </p>
      </div>

      {isLoading ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Carregando...</CardContent></Card>
      ) : !pedidos || pedidos.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center space-y-3">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-muted text-muted-foreground">
              <ShoppingCart className="h-6 w-6" />
            </div>
            <p className="text-sm text-muted-foreground">Nenhum pedido recebido ainda.</p>
          </CardContent>
        </Card>
      ) : (
        (() => {
          const totalPages = Math.max(1, Math.ceil(pedidos.length / PAGE_SIZE));
          const currentPage = Math.min(page, totalPages);
          const start = (currentPage - 1) * PAGE_SIZE;
          const pageItems = pedidos.slice(start, start + PAGE_SIZE);
          return (
        <div className="space-y-3">
          {pageItems.map((p) => (
            <Card key={p.id}>
              <CardContent className="p-4 flex flex-col md:flex-row md:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{p.numero}</span>
                    <Badge variant={statusVariant[p.status] ?? "default"}>{statusLabel[p.status] ?? p.status}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(p.created_at).toLocaleString("pt-BR")}
                    </span>
                  </div>
                  <p className="text-sm mt-1">
                    <strong>{p.clientes?.nome ?? "—"}</strong>
                    {p.clientes?.whatsapp && <span className="text-muted-foreground"> · {p.clientes.whatsapp}</span>}
                  </p>
                  <p className="text-sm font-bold mt-1">{formatBRL(Number(p.total))}</p>
                </div>
                <div className="flex gap-2 items-center">
                  <Select value={p.status} onValueChange={(v) => updateStatus(p.id, v)}>
                    <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUS.map((s) => <SelectItem key={s} value={s}>{statusLabel[s]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="outline" onClick={() => setSel(p)}>
                    <Eye className="h-4 w-4 mr-1" /> Ver
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => excluir(p.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-muted-foreground">
                Mostrando {start + 1}–{Math.min(start + PAGE_SIZE, pedidos.length)} de {pedidos.length}
              </p>
              <div className="flex items-center gap-1 flex-wrap">
                <Button size="sm" variant="outline" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>
                  Anterior
                </Button>
                {Array.from({ length: totalPages }).map((_, i) => {
                  const n = i + 1;
                  return (
                    <Button
                      key={n}
                      size="sm"
                      variant={n === currentPage ? "default" : "outline"}
                      onClick={() => setPage(n)}
                      className="w-9"
                    >
                      {n}
                    </Button>
                  );
                })}
                <Button size="sm" variant="outline" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)}>
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </div>
          );
        })()
      )}

      <Dialog open={!!sel} onOpenChange={(v) => !v && setSel(null)}>

        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Pedido {sel?.numero}</DialogTitle></DialogHeader>
          {sel && (
            <div className="space-y-3 text-sm">
              <div className="rounded-md border p-3 space-y-1">
                <p><strong>Cliente:</strong> {sel.clientes?.nome}</p>
                <p><strong>WhatsApp:</strong> {sel.clientes?.whatsapp}</p>
                {sel.clientes?.email && <p><strong>E-mail:</strong> {sel.clientes.email}</p>}
                {sel.observacoes && <p><strong>Observações:</strong> {sel.observacoes}</p>}
              </div>
              <div className="rounded-md border">
                <div className="p-3 border-b font-medium">Itens</div>
                <div className="divide-y">
                  {(itens ?? []).map((it) => (
                    <div key={it.id} className="p-3 flex justify-between gap-2">
                      <span>{it.quantidade}x {it.produto_nome}</span>
                      <span className="font-medium">{formatBRL(Number(it.valor_total))}</span>
                    </div>
                  ))}
                </div>
                <div className="p-3 border-t flex justify-between font-bold">
                  <span>Total</span><span>{formatBRL(Number(sel.total))}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
