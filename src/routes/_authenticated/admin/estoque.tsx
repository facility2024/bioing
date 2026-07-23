import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Boxes, Pencil, Search, Plus, Minus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/estoque")({
  component: EstoqueAdmin,
});

type ProdutoEstoque = {
  id: string;
  nome: string;
  imagem_url: string | null;
  estoque: number;
  controla_estoque: boolean;
  ativo: boolean;
};

function EstoqueAdmin() {
  const qc = useQueryClient();
  const [busca, setBusca] = useState("");
  const [editando, setEditando] = useState<ProdutoEstoque | null>(null);
  const [novaQtd, setNovaQtd] = useState("0");
  const [controla, setControla] = useState(true);
  const [saving, setSaving] = useState(false);

  const { data: produtos, isLoading } = useQuery({
    queryKey: ["admin-estoque"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("produtos")
        .select("id, nome, imagem_url, estoque, controla_estoque, ativo")
        .order("nome", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ProdutoEstoque[];
    },
  });

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return produtos ?? [];
    return (produtos ?? []).filter((p) => p.nome.toLowerCase().includes(q));
  }, [produtos, busca]);

  const abrirEditar = (p: ProdutoEstoque) => {
    setEditando(p);
    setNovaQtd(String(p.estoque ?? 0));
    setControla(!!p.controla_estoque);
  };

  const salvar = async () => {
    if (!editando) return;
    const qtd = Math.max(0, Math.floor(Number(novaQtd) || 0));
    setSaving(true);
    const { error } = await supabase
      .from("produtos")
      .update({ estoque: qtd, controla_estoque: controla })
      .eq("id", editando.id);
    setSaving(false);
    if (error) return toast.error("Erro: " + error.message);
    toast.success("Estoque atualizado");
    setEditando(null);
    qc.invalidateQueries({ queryKey: ["admin-estoque"] });
    qc.invalidateQueries({ queryKey: ["admin-produtos"] });
    qc.invalidateQueries({ queryKey: ["produtos-loja"] });
  };

  const ajustar = (delta: number) => {
    setNovaQtd((v) => String(Math.max(0, (Number(v) || 0) + delta)));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Controle de estoque</h2>
          <p className="text-sm text-muted-foreground">
            Ajuste manualmente a quantidade de cada produto. Ao vender, o estoque é abatido automaticamente.
          </p>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-8"
          placeholder="Buscar produto..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">Carregando...</CardContent>
        </Card>
      ) : filtrados.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center space-y-3">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-muted text-muted-foreground">
              <Boxes className="h-6 w-6" />
            </div>
            <p className="text-sm text-muted-foreground">Nenhum produto encontrado.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {filtrados.map((p) => {
                const semEstoque = p.controla_estoque && p.estoque <= 0;
                const baixo = p.controla_estoque && p.estoque > 0 && p.estoque <= 5;
                return (
                  <div key={p.id} className="flex items-center gap-3 p-3 sm:p-4">
                    <div className="h-12 w-12 shrink-0 rounded-md border bg-muted overflow-hidden">
                      {p.imagem_url ? (
                        <img src={p.imagem_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full grid place-items-center text-muted-foreground">
                          <Boxes className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.nome}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        {p.controla_estoque ? (
                          <Badge variant={semEstoque ? "destructive" : baixo ? "secondary" : "outline"}>
                            {p.estoque} em estoque
                          </Badge>
                        ) : (
                          <Badge variant="outline">Sem controle</Badge>
                        )}
                        {!p.ativo && <Badge variant="secondary">Inativo</Badge>}
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => abrirEditar(p)}>
                      <Pencil className="h-4 w-4 mr-1" />
                      Editar
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!editando} onOpenChange={(o) => !o && setEditando(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar estoque</DialogTitle>
            <DialogDescription className="sr-only">Ajuste manual de estoque do produto</DialogDescription>
          </DialogHeader>
          {editando && (
            <div className="space-y-4">
              <p className="text-sm font-medium">{editando.nome}</p>
              <div className="flex items-center justify-between rounded-md border p-3">
                <Label className="text-sm">Controlar estoque deste produto</Label>
                <Switch checked={controla} onCheckedChange={setControla} />
              </div>
              <div className="space-y-1.5">
                <Label>Quantidade em estoque</Label>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="icon" onClick={() => ajustar(-1)} disabled={!controla}>
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    type="number"
                    min={0}
                    value={novaQtd}
                    onChange={(e) => setNovaQtd(e.target.value)}
                    disabled={!controla}
                    className="text-center"
                  />
                  <Button type="button" variant="outline" size="icon" onClick={() => ajustar(1)} disabled={!controla}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Este valor substitui o atual. Ao vender, o sistema abate automaticamente.
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditando(null)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={salvar} disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
