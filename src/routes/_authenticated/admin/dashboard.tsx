import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ShoppingCart, Users, Package, DollarSign, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/dashboard")({
  component: DashboardPage,
});

type DashboardStats = {
  totalPedidos: number;
  totalClientes: number;
  totalProdutos: number;
  valorTotal: number;
  ultimosPedidos: Array<{
    id: string;
    numero: string;
    total: number;
    status: string;
    created_at: string;
    cliente_nome: string | null;
  }>;
};

async function fetchDashboardStats(): Promise<DashboardStats> {
  const [pedidosCount, clientesCount, produtosCount, pedidosAgg, ultimosRes] = await Promise.all([
    supabase.from("pedidos").select("*", { count: "exact", head: true }),
    supabase.from("clientes").select("*", { count: "exact", head: true }),
    supabase.from("produtos").select("*", { count: "exact", head: true }),
    supabase.from("pedidos").select("total"),
    supabase
      .from("pedidos")
      .select("id, numero, total, status, created_at, clientes(nome)")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const valorTotal = (pedidosAgg.data ?? []).reduce((sum, p) => sum + Number(p.total ?? 0), 0);

  const ultimosPedidos = (ultimosRes.data ?? []).map((p) => ({
    id: p.id as string,
    numero: p.numero as string,
    total: Number(p.total ?? 0),
    status: p.status as string,
    created_at: p.created_at as string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cliente_nome: (p.clientes as any)?.nome ?? null,
  }));

  return {
    totalPedidos: pedidosCount.count ?? 0,
    totalClientes: clientesCount.count ?? 0,
    totalProdutos: produtosCount.count ?? 0,
    valorTotal,
    ultimosPedidos,
  };
}

function formatCurrency(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function statusVariant(status: string): "default" | "secondary" | "outline" {
  if (status === "concluido" || status === "entregue") return "default";
  if (status === "novo") return "secondary";
  return "outline";
}

function DashboardPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: fetchDashboardStats,
  });

  const cards = [
    { label: "Total de Pedidos", value: data?.totalPedidos ?? 0, icon: ShoppingCart, color: "text-blue-600 bg-blue-50 dark:bg-blue-950/40" },
    { label: "Total de Clientes", value: data?.totalClientes ?? 0, icon: Users, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40" },
    { label: "Total de Produtos", value: data?.totalProdutos ?? 0, icon: Package, color: "text-amber-600 bg-amber-50 dark:bg-amber-950/40" },
    { label: "Valor Total", value: formatCurrency(data?.valorTotal ?? 0), icon: DollarSign, color: "text-purple-600 bg-purple-50 dark:bg-purple-950/40" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Visão geral</h2>
        <p className="text-sm text-muted-foreground">Resumo em tempo real da sua loja.</p>
      </div>

      <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(220px,1fr))]">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground truncate">{c.label}</p>
                  {isLoading ? (
                    <Skeleton className="mt-2 h-8 w-24" />
                  ) : (
                    <p className="mt-1 text-2xl font-bold truncate">{c.value}</p>
                  )}
                </div>
                <div className={`shrink-0 grid h-10 w-10 place-items-center rounded-lg ${c.color}`}>
                  <c.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Últimos pedidos</CardTitle>
          <Link to="/admin/pedidos" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            Ver todos <ArrowRight className="h-3 w-3" />
          </Link>
        </CardHeader>
        <CardContent>
          {isError && <p className="text-sm text-destructive">Erro ao carregar pedidos.</p>}
          {isLoading && (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          )}
          {!isLoading && data?.ultimosPedidos.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum pedido ainda.</p>
          )}
          {!isLoading && data && data.ultimosPedidos.length > 0 && (
            <div className="divide-y">
              {data.ultimosPedidos.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{p.numero}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {p.cliente_nome ?? "Sem cliente"} · {formatDate(p.created_at)}
                    </p>
                  </div>
                  <div className="shrink-0 flex items-center gap-3">
                    <Badge variant={statusVariant(p.status)} className="capitalize">{p.status}</Badge>
                    <p className="font-semibold text-sm tabular-nums">{formatCurrency(p.total)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
