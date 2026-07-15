import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Line,
  LineChart,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  FileDown,
  TrendingUp,
  ShoppingBag,
  DollarSign,
  MapPin,
  User,
  Package,
  Loader2,
  CalendarDays,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/extrato")({
  component: ExtratoPage,
});

function formatBRL(n: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
}

type ItemRow = {
  id: string;
  produto_nome: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
};

type PedidoRow = {
  id: string;
  numero: string;
  total: number;
  subtotal: number;
  status: string | null;
  observacoes: string | null;
  created_at: string;
  clientes: { nome: string; whatsapp: string; email: string | null } | null;
  itens_pedido: ItemRow[];
};

function parseEnderecoObs(obs: string | null): { endereco: string; cidade: string; cep: string; observacao: string } {
  if (!obs) return { endereco: "", cidade: "", cep: "", observacao: "" };
  let endereco = "";
  let observacao = "";
  const parts = obs.split(" | ");
  for (const p of parts) {
    if (p.startsWith("Endereço:")) endereco = p.replace("Endereço:", "").trim();
    else if (p.startsWith("Obs:")) observacao = p.replace("Obs:", "").trim();
  }
  // endereco: "rua - cidade - cep"
  const seg = endereco.split(" - ").map((s) => s.trim());
  const cep = seg.length >= 3 ? seg[seg.length - 1] : "";
  const cidade = seg.length >= 2 ? seg[seg.length - 2] : "";
  const rua = seg.length >= 1 ? seg.slice(0, Math.max(1, seg.length - 2)).join(" - ") : "";
  return { endereco: rua, cidade, cep, observacao };
}

const COLORS = ["#397c2f", "#5aa651", "#7fc776", "#a3d99b", "#c9ecc4", "#e4f6e1"];

function ExtratoPage() {
  // Mês selecionado (default: mês atual). Formato "YYYY-MM"
  const now = new Date();
  const [mesRef, setMesRef] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
  );

  const [ano, mes] = mesRef.split("-").map(Number);
  const inicio = useMemo(() => new Date(ano, mes - 1, 1, 0, 0, 0), [ano, mes]);
  const fim = useMemo(() => new Date(ano, mes, 1, 0, 0, 0), [ano, mes]);

  const printRef = useRef<HTMLDivElement>(null);

  const { data: pedidos, isLoading } = useQuery({
    queryKey: ["extrato-pedidos", mesRef],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pedidos")
        .select(
          "id, numero, total, subtotal, status, observacoes, created_at, clientes(nome, whatsapp, email), itens_pedido(id, produto_nome, quantidade, valor_unitario, valor_total)",
        )
        .gte("created_at", inicio.toISOString())
        .lt("created_at", fim.toISOString())
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as PedidoRow[];
    },
  });

  // Métricas
  const metrics = useMemo(() => {
    const lista = pedidos ?? [];
    const totalVendas = lista.reduce((s, p) => s + Number(p.total || 0), 0);
    const totalPedidos = lista.length;
    const ticketMedio = totalPedidos ? totalVendas / totalPedidos : 0;
    const clientesUnicos = new Set(lista.map((p) => p.clientes?.whatsapp).filter(Boolean)).size;
    return { totalVendas, totalPedidos, ticketMedio, clientesUnicos };
  }, [pedidos]);

  // Vendas por dia
  const vendasPorDia = useMemo(() => {
    const map = new Map<string, number>();
    const diasNoMes = new Date(ano, mes, 0).getDate();
    for (let d = 1; d <= diasNoMes; d++) {
      map.set(String(d).padStart(2, "0"), 0);
    }
    for (const p of pedidos ?? []) {
      const day = String(new Date(p.created_at).getDate()).padStart(2, "0");
      map.set(day, (map.get(day) || 0) + Number(p.total || 0));
    }
    return Array.from(map.entries()).map(([dia, valor]) => ({ dia, valor }));
  }, [pedidos, ano, mes]);

  // Ranking cidades
  const rankingCidades = useMemo(() => {
    const map = new Map<string, { pedidos: number; total: number }>();
    for (const p of pedidos ?? []) {
      const { cidade } = parseEnderecoObs(p.observacoes);
      const key = cidade.trim() || "Não informado";
      const cur = map.get(key) || { pedidos: 0, total: 0 };
      cur.pedidos += 1;
      cur.total += Number(p.total || 0);
      map.set(key, cur);
    }
    return Array.from(map.entries())
      .map(([cidade, v]) => ({ cidade, ...v }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [pedidos]);

  // Top produtos
  const topProdutos = useMemo(() => {
    const map = new Map<string, { qtd: number; total: number }>();
    for (const p of pedidos ?? []) {
      for (const it of p.itens_pedido || []) {
        const cur = map.get(it.produto_nome) || { qtd: 0, total: 0 };
        cur.qtd += it.quantidade;
        cur.total += Number(it.valor_total || 0);
        map.set(it.produto_nome, cur);
      }
    }
    return Array.from(map.entries())
      .map(([nome, v]) => ({ nome, ...v }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [pedidos]);

  // Opções do seletor de mês (últimos 3 meses — dado que é limpo a cada 45 dias)
  const mesOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = [];
    for (let i = 0; i < 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const v = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
      opts.push({ value: v, label: label[0].toUpperCase() + label.slice(1) });
    }
    return opts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mesLabel = mesOptions.find((o) => o.value === mesRef)?.label || mesRef;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 print:p-0">
      {/* Print styles */}
      <style>{`
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          aside, [data-sidebar] { display: none !important; }
          .print-full { width: 100% !important; }
          .print-break { page-break-inside: avoid; }
        }
      `}</style>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 no-print">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-header" />
            Extrato de Vendas
          </h1>
          <p className="text-sm text-muted-foreground">
            Ciclo mensal — dados mantidos por 45 dias, novo mês inicia um novo ciclo.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={mesRef} onValueChange={setMesRef}>
            <SelectTrigger className="w-52">
              <CalendarDays className="h-4 w-4 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {mesOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handlePrint} className="bg-header hover:bg-header/90 text-white">
            <FileDown className="h-4 w-4 mr-2" /> Baixar PDF
          </Button>
        </div>
      </div>

      <div ref={printRef} className="space-y-6">
        {/* Print header */}
        <div className="hidden print:block text-center border-b pb-3">
          <h1 className="text-2xl font-bold">Extrato de Vendas — {mesLabel}</h1>
          <p className="text-sm text-gray-600">
            Gerado em {new Date().toLocaleString("pt-BR")}
          </p>
        </div>

        {/* Cards de métricas */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Total em vendas"
            value={formatBRL(metrics.totalVendas)}
            icon={<DollarSign className="h-5 w-5" />}
            accent="from-emerald-500 to-emerald-600"
          />
          <MetricCard
            title="Pedidos"
            value={String(metrics.totalPedidos)}
            icon={<ShoppingBag className="h-5 w-5" />}
            accent="from-blue-500 to-blue-600"
          />
          <MetricCard
            title="Ticket médio"
            value={formatBRL(metrics.ticketMedio)}
            icon={<TrendingUp className="h-5 w-5" />}
            accent="from-amber-500 to-amber-600"
          />
          <MetricCard
            title="Clientes únicos"
            value={String(metrics.clientesUnicos)}
            icon={<User className="h-5 w-5" />}
            accent="from-purple-500 to-purple-600"
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mr-2" /> Carregando extrato...
          </div>
        ) : (
          <>
            {/* Gráficos */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 print-break">
              <Card className="lg:col-span-2 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">Vendas por dia</CardTitle>
                </CardHeader>
                <CardContent className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={vendasPorDia}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="dia" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${v}`} />
                      <Tooltip
                        formatter={(v: number) => formatBRL(v)}
                        labelFormatter={(l) => `Dia ${l}`}
                      />
                      <Line
                        type="monotone"
                        dataKey="valor"
                        stroke="#397c2f"
                        strokeWidth={3}
                        dot={{ r: 3, fill: "#397c2f" }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">Top produtos</CardTitle>
                </CardHeader>
                <CardContent className="h-72">
                  {topProdutos.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-10">
                      Sem dados no período.
                    </p>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={topProdutos}
                          dataKey="total"
                          nameKey="nome"
                          innerRadius={45}
                          outerRadius={80}
                          paddingAngle={2}
                        >
                          {topProdutos.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: number) => formatBRL(v)} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Ranking de cidades */}
            <Card className="shadow-sm print-break">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-header" /> Ranking de cidades — vendas
                </CardTitle>
              </CardHeader>
              <CardContent>
                {rankingCidades.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    Nenhuma cidade identificada nos pedidos do período.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={rankingCidades} layout="vertical" margin={{ left: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis type="number" tickFormatter={(v) => `R$${v}`} tick={{ fontSize: 11 }} />
                          <YAxis
                            type="category"
                            dataKey="cidade"
                            tick={{ fontSize: 11 }}
                            width={110}
                          />
                          <Tooltip formatter={(v: number) => formatBRL(v)} />
                          <Bar dataKey="total" fill="#397c2f" radius={[0, 6, 6, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-2">
                      {rankingCidades.map((c, i) => (
                        <div
                          key={c.cidade}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/40"
                        >
                          <div
                            className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-white shrink-0 ${
                              i === 0
                                ? "bg-amber-500"
                                : i === 1
                                  ? "bg-slate-400"
                                  : i === 2
                                    ? "bg-orange-600"
                                    : "bg-header"
                            }`}
                          >
                            {i + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{c.cidade}</p>
                            <p className="text-xs text-muted-foreground">
                              {c.pedidos} pedido{c.pedidos > 1 ? "s" : ""}
                            </p>
                          </div>
                          <p className="font-semibold text-header">{formatBRL(c.total)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Relatório detalhado */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold">
                  Relatório detalhado — {mesLabel}
                </h2>
                <Badge variant="secondary">{pedidos?.length ?? 0} pedidos</Badge>
              </div>

              {(!pedidos || pedidos.length === 0) ? (
                <Card className="p-8 text-center text-muted-foreground">
                  Nenhum pedido registrado neste ciclo.
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {pedidos.map((p) => {
                    const end = parseEnderecoObs(p.observacoes);
                    return (
                      <Card
                        key={p.id}
                        className="shadow-sm hover:shadow-md transition-shadow print-break"
                      >
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <CardTitle className="text-sm font-mono text-header">
                                {p.numero}
                              </CardTitle>
                              <p className="text-xs text-muted-foreground">
                                {new Date(p.created_at).toLocaleString("pt-BR")}
                              </p>
                            </div>
                            <Badge
                              variant="outline"
                              className="capitalize border-header text-header"
                            >
                              {p.status || "novo"}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                          <div className="rounded-md bg-muted/40 p-2 space-y-0.5">
                            <p className="flex items-center gap-1.5 font-medium">
                              <User className="h-3.5 w-3.5" />
                              {p.clientes?.nome || "—"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              📱 {p.clientes?.whatsapp || "—"}
                              {p.clientes?.email ? ` · ✉️ ${p.clientes.email}` : ""}
                            </p>
                            {(end.endereco || end.cidade || end.cep) && (
                              <p className="text-xs text-muted-foreground flex items-start gap-1">
                                <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                                <span>
                                  {[end.endereco, end.cidade, end.cep]
                                    .filter(Boolean)
                                    .join(" — ")}
                                </span>
                              </p>
                            )}
                            {end.observacao && (
                              <p className="text-xs italic text-muted-foreground">
                                Obs: {end.observacao}
                              </p>
                            )}
                          </div>

                          <div className="space-y-1">
                            <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                              <Package className="h-3 w-3" /> Produtos
                            </p>
                            <ul className="space-y-0.5">
                              {(p.itens_pedido || []).map((it) => (
                                <li
                                  key={it.id}
                                  className="flex justify-between text-xs gap-2"
                                >
                                  <span className="truncate">
                                    {it.quantidade}× {it.produto_nome}
                                  </span>
                                  <span className="tabular-nums text-muted-foreground shrink-0">
                                    {formatBRL(Number(it.valor_total))}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div className="flex justify-between items-center pt-2 border-t">
                            <span className="text-xs text-muted-foreground">Total gasto</span>
                            <span className="text-base font-bold text-header">
                              {formatBRL(Number(p.total))}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Rodapé impresso */}
            <div className="hidden print:block text-center text-xs text-gray-500 pt-4 border-t">
              <p>Extrato gerado automaticamente — Ingredientes Bio</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  icon,
  accent,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  accent: string;
}) {
  return (
    <Card className="overflow-hidden shadow-sm relative">
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accent}`} />
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">{title}</p>
          <div className={`p-1.5 rounded-md bg-gradient-to-br ${accent} text-white`}>
            {icon}
          </div>
        </div>
        <p className="text-2xl font-bold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}
