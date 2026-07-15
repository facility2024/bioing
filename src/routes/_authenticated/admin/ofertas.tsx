import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Search, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/ofertas")({
  component: OfertasAdmin,
});

type Oferta = {
  id?: string;
  ativo: boolean;
  titulo: string;
  descricao: string;
  imagem_url: string;
  cta_texto: string;
  cta_url: string;
  mostrar_logo: boolean;
  auto_fechar_segundos: number;
  fechar_manualmente: boolean;
};

const empty: Oferta = {
  ativo: false,
  titulo: "",
  descricao: "",
  imagem_url: "",
  cta_texto: "Aproveitar oferta",
  cta_url: "",
  mostrar_logo: true,
  auto_fechar_segundos: 4,
  fechar_manualmente: true,
};

type ProdutoLite = { id: string; nome: string; imagem_url: string | null };

function OfertasAdmin() {
  const qc = useQueryClient();
  const [form, setForm] = useState<Oferta>(empty);
  const [saving, setSaving] = useState(false);
  const [buscaProduto, setBuscaProduto] = useState("");
  const [showBusca, setShowBusca] = useState(false);

  const { data: produtos } = useQuery({
    queryKey: ["admin-ofertas-produtos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("produtos")
        .select("id, nome, imagem_url")
        .eq("ativo", true)
        .order("nome", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ProdutoLite[];
    },
  });

  const produtoSelecionadoId = useMemo(() => {
    const m = /[?&]produto=([^&]+)/.exec(form.cta_url || "");
    return m ? decodeURIComponent(m[1]) : null;
  }, [form.cta_url]);

  const produtoSelecionado = useMemo(
    () => produtos?.find((p) => p.id === produtoSelecionadoId) ?? null,
    [produtos, produtoSelecionadoId],
  );

  const resultadosBusca = useMemo(() => {
    const q = buscaProduto.trim().toLowerCase();
    if (!q || !produtos) return [];
    return produtos.filter((p) => p.nome.toLowerCase().includes(q)).slice(0, 8);
  }, [buscaProduto, produtos]);

  const { data } = useQuery({
    queryKey: ["admin-oferta-popup"],
    queryFn: async () => {
      const { data, error } = await supabase.from("oferta_popup").select("*").limit(1).maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  useEffect(() => {
    if (data) setForm({ ...empty, ...data });
  }, [data]);

  const set = <K extends keyof Oferta>(k: K, v: Oferta[K]) => setForm((f) => ({ ...f, [k]: v }));

  const salvar = async () => {
    setSaving(true);
    const payload = {
      ativo: form.ativo,
      titulo: form.titulo || null,
      descricao: form.descricao || null,
      imagem_url: form.imagem_url || null,
      cta_texto: form.cta_texto || null,
      cta_url: form.cta_url || null,
      mostrar_logo: form.mostrar_logo,
      auto_fechar_segundos: Number(form.auto_fechar_segundos) || 0,
      fechar_manualmente: form.fechar_manualmente,
    };
    const { error } = form.id
      ? await supabase.from("oferta_popup").update(payload).eq("id", form.id)
      : await supabase.from("oferta_popup").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Oferta salva");
    qc.invalidateQueries({ queryKey: ["admin-oferta-popup"] });
    qc.invalidateQueries({ queryKey: ["oferta-popup"] });
    if (typeof window !== "undefined") sessionStorage.removeItem("oferta-popup-visto");
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Oferta de abertura</h2>
        <p className="text-sm text-muted-foreground">
          Popup exibido quando o cliente abre o site. Fecha manualmente ou automaticamente após o tempo definido.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            Configuração
            <div className="flex items-center gap-2 text-sm font-normal">
              <span>Ativa</span>
              <Switch checked={form.ativo} onCheckedChange={(v) => set("ativo", v)} />
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label>Texto da chamada (título)</Label>
            <Input value={form.titulo} onChange={(e) => set("titulo", e.target.value)} placeholder="Ex.: OFERTA IMPERDÍVEL!" />
          </div>
          <div className="space-y-1.5">
            <Label>Descrição da oferta</Label>
            <Textarea rows={3} value={form.descricao} onChange={(e) => set("descricao", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Imagem da oferta (URL)</Label>
            <Input value={form.imagem_url} onChange={(e) => set("imagem_url", e.target.value)} placeholder="https://..." />
            {form.imagem_url && <img src={form.imagem_url} alt="" className="mt-2 h-32 w-full object-cover rounded border" />}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Texto do botão (CTA)</Label>
              <Input value={form.cta_texto} onChange={(e) => set("cta_texto", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Link do botão</Label>
              <Input value={form.cta_url} onChange={(e) => set("cta_url", e.target.value)} placeholder="/ ou https://..." />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label className="text-sm">Mostrar logo no topo</Label>
              </div>
              <Switch checked={form.mostrar_logo} onCheckedChange={(v) => set("mostrar_logo", v)} />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label className="text-sm">Permitir fechar</Label>
              </div>
              <Switch checked={form.fechar_manualmente} onCheckedChange={(v) => set("fechar_manualmente", v)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Fechar sozinho em (seg)</Label>
              <Input
                type="number"
                min={0}
                value={form.auto_fechar_segundos}
                onChange={(e) => set("auto_fechar_segundos", Number(e.target.value))}
              />
              <p className="text-[11px] text-muted-foreground">0 = não fechar automaticamente</p>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Produto vinculado ao botão</Label>
            {produtoSelecionado ? (
              <div className="flex items-center gap-3 rounded-md border p-2">
                {produtoSelecionado.imagem_url && (
                  <img src={produtoSelecionado.imagem_url} alt="" className="h-10 w-10 rounded object-cover border" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{produtoSelecionado.nome}</p>
                  <p className="text-xs text-muted-foreground truncate">{form.cta_url}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    set("cta_url", "");
                    setBuscaProduto("");
                    setShowBusca(false);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-8"
                    placeholder="Digite o nome do produto em oferta..."
                    value={buscaProduto}
                    onChange={(e) => {
                      setBuscaProduto(e.target.value);
                      setShowBusca(true);
                    }}
                    onFocus={() => setShowBusca(true)}
                  />
                </div>
                {showBusca && resultadosBusca.length > 0 && (
                  <ul className="absolute z-10 mt-1 w-full max-h-64 overflow-auto rounded-md border bg-popover shadow-md">
                    {resultadosBusca.map((p) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          className="w-full flex items-center gap-2 p-2 text-left hover:bg-muted"
                          onClick={() => {
                            set("cta_url", `/?produto=${p.id}`);
                            setBuscaProduto("");
                            setShowBusca(false);
                          }}
                        >
                          {p.imagem_url && (
                            <img src={p.imagem_url} alt="" className="h-8 w-8 rounded object-cover border" />
                          )}
                          <span className="text-sm truncate">{p.nome}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {showBusca && buscaProduto.trim() && resultadosBusca.length === 0 && (
                  <p className="text-xs text-muted-foreground mt-1">Nenhum produto encontrado.</p>
                )}
              </div>
            )}
            <p className="text-[11px] text-muted-foreground">
              Ao clicar no botão da oferta, o cliente será levado direto à página do produto.
              Deixe em branco para usar um link personalizado abaixo.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Texto do botão (CTA)</Label>
              <Input value={form.cta_texto} onChange={(e) => set("cta_texto", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Link personalizado (opcional)</Label>
              <Input
                value={form.cta_url}
                onChange={(e) => set("cta_url", e.target.value)}
                placeholder="/ ou https://..."
                disabled={!!produtoSelecionado}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Button onClick={salvar} disabled={saving} size="lg">
        {saving ? "Salvando..." : "Salvar oferta"}
      </Button>
    </div>
  );
}
