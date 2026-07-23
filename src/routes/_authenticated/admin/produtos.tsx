import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, X, Package, Copy, Link2 } from "lucide-react";
import { toast } from "sonner";
import { formatBRL } from "@/hooks/use-cart";

export const Route = createFileRoute("/_authenticated/admin/produtos")({
  component: ProdutosAdmin,
});

type Produto = {
  id: string;
  nome: string;
  descricao: string | null;
  preco: number;
  imagem_url: string | null;
  imagens: string[] | null;
  estoque: number;
  controla_estoque: boolean;
  ativo: boolean;
  categoria_id: string | null;
  secao: number;
};

type Categoria = { id: string; nome: string };

const emptyForm = {
  id: "" as string | null,
  nome: "",
  descricao: "",
  preco: "",
  imagem_url: "",
  imagens: [] as string[],
  estoque: "0",
  controla_estoque: false,
  ativo: true,
  categoria_id: "" as string | "",
  secao: 1 as number,
};

function ProdutosAdmin() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [newImg, setNewImg] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: produtos, isLoading } = useQuery({
    queryKey: ["admin-produtos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("produtos")
        .select("id, nome, descricao, preco, imagem_url, imagens, estoque, controla_estoque, ativo, categoria_id, secao")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Produto[];
    },
  });

  const { data: categorias } = useQuery({
    queryKey: ["admin-categorias-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categorias").select("id, nome").order("nome");
      if (error) throw error;
      return data as Categoria[];
    },
  });

  const catMap = useMemo(() => {
    const m = new Map<string, string>();
    (categorias ?? []).forEach((c) => m.set(c.id, c.nome));
    return m;
  }, [categorias]);

  const openNew = () => {
    setForm(emptyForm);
    setNewImg("");
    setOpen(true);
  };

  const openEdit = (p: Produto) => {
    setForm({
      id: p.id,
      nome: p.nome,
      descricao: p.descricao ?? "",
      preco: String(p.preco),
      imagem_url: p.imagem_url ?? "",
      imagens: p.imagens ?? [],
      estoque: String(p.estoque ?? 0),
      controla_estoque: !!p.controla_estoque,
      ativo: !!p.ativo,
      categoria_id: p.categoria_id ?? "",
      secao: p.secao ?? 1,
    });
    setNewImg("");
    setOpen(true);
  };

  const addImage = () => {
    const url = newImg.trim();
    if (!url) return;
    setForm((f) => ({ ...f, imagens: [...f.imagens, url] }));
    setNewImg("");
  };

  const removeImage = (idx: number) => {
    setForm((f) => ({ ...f, imagens: f.imagens.filter((_, i) => i !== idx) }));
  };

  const handleSave = async () => {
    if (!form.nome.trim()) {
      toast.error("Informe o nome do produto");
      return;
    }
    const preco = Number(form.preco);
    if (!Number.isFinite(preco) || preco < 0) {
      toast.error("Preço inválido");
      return;
    }
    setSaving(true);
    const payload = {
      nome: form.nome.trim(),
      descricao: form.descricao.trim() || null,
      preco,
      imagem_url: form.imagem_url.trim() || null,
      imagens: form.imagens,
      estoque: Number(form.estoque) || 0,
      controla_estoque: form.controla_estoque,
      ativo: form.ativo,
      categoria_id: form.categoria_id || null,
      secao: form.secao || 1,
    };
    const { error } = form.id
      ? await supabase.from("produtos").update(payload as any).eq("id", form.id)
      : await supabase.from("produtos").insert(payload as any);
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
      return;
    }
    toast.success(form.id ? "Produto atualizado" : "Produto criado");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["admin-produtos"] });
    qc.invalidateQueries({ queryKey: ["produtos-loja"] });
  };

  const handleDelete = async (p: Produto) => {
    if (!confirm(`Excluir "${p.nome}"?`)) return;
    const { error } = await supabase.from("produtos").delete().eq("id", p.id);
    if (error) {
      toast.error("Erro ao excluir: " + error.message);
      return;
    }
    toast.success("Produto excluído");
    qc.invalidateQueries({ queryKey: ["admin-produtos"] });
    qc.invalidateQueries({ queryKey: ["produtos-loja"] });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Produtos</h2>
          <p className="text-sm text-muted-foreground">
            Cadastre nome, descrição, preço e várias imagens (usadas na troca por hover e no pop-up de detalhes).
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-2" />
          Novo produto
        </Button>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">Carregando...</CardContent>
        </Card>
      ) : !produtos || produtos.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center space-y-3">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-muted text-muted-foreground">
              <Package className="h-6 w-6" />
            </div>
            <p className="text-sm text-muted-foreground">Nenhum produto cadastrado ainda.</p>
            <Button onClick={openNew} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Cadastrar primeiro produto
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {produtos.map((p) => (
            <Card key={p.id} className="overflow-hidden">
              <div className="aspect-video bg-muted overflow-hidden">
                {p.imagem_url ? (
                  <img src={p.imagem_url} alt={p.nome} className="h-full w-full object-contain" />
                ) : (
                  <div className="h-full w-full grid place-items-center text-muted-foreground">
                    <Package className="h-8 w-8" />
                  </div>
                )}
              </div>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-sm line-clamp-2">{p.nome}</h3>
                  <div className="flex gap-1 shrink-0">
                    {!p.ativo && <Badge variant="secondary">Inativo</Badge>}
                  </div>
                </div>
                {p.descricao && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{p.descricao}</p>
                )}
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-base">{formatBRL(Number(p.preco))}</span>
                  <span className="text-muted-foreground">
                    {p.categoria_id ? catMap.get(p.categoria_id) ?? "—" : "Sem categoria"}
                  </span>
                </div>
                {p.controla_estoque && (
                  <p className="text-xs text-muted-foreground">Estoque: {p.estoque}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {(p.imagens?.length ?? 0) + (p.imagem_url ? 1 : 0)} imagem(ns)
                </p>
                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(p)} className="flex-1">
                    <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(p)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar produto" : "Novo produto"}</DialogTitle>
            <DialogDescription className="sr-only">Formulário de cadastro/edição de produto</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="nome">Nome *</Label>
              <Input id="nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="descricao">Descrição do produto</Label>
              <Textarea
                id="descricao"
                rows={4}
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                placeholder="Exibida no card e no pop-up de detalhes"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="preco">Preço (R$) *</Label>
                <Input
                  id="preco"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.preco}
                  onChange={(e) => setForm({ ...form, preco: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="categoria">Categoria</Label>
                <Select
                  value={form.categoria_id || "_none"}
                  onValueChange={(v) => setForm({ ...form, categoria_id: v === "_none" ? "" : v })}
                >
                  <SelectTrigger id="categoria">
                    <SelectValue placeholder="Sem categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Sem categoria</SelectItem>
                    {(categorias ?? []).map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="secao">Seção na home</Label>
              <Select
                value={String(form.secao || 1)}
                onValueChange={(v) => setForm({ ...form, secao: Number(v) })}
              >
                <SelectTrigger id="secao">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      Seção {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Define em qual bloco da página inicial este produto será exibido (abaixo do banner correspondente).
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="img">Imagem principal (URL)</Label>
              <Input
                id="img"
                value={form.imagem_url}
                onChange={(e) => setForm({ ...form, imagem_url: e.target.value })}
                placeholder="https://..."
              />
              {form.imagem_url && (
                <img
                  src={form.imagem_url}
                  alt=""
                  className="mt-2 h-24 w-24 object-contain rounded border bg-white"
                />
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Galeria de imagens (troca ao passar o mouse)</Label>
              <div className="flex gap-2">
                <Input
                  value={newImg}
                  onChange={(e) => setNewImg(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addImage();
                    }
                  }}
                  placeholder="Cole a URL da imagem e clique em Adicionar"
                />
                <Button type="button" variant="secondary" onClick={addImage}>
                  Adicionar
                </Button>
              </div>
              {form.imagens.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {form.imagens.map((url, i) => (
                    <div key={url + i} className="relative">
                      <img src={url} alt="" className="h-20 w-20 object-contain rounded border bg-white" />
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-destructive text-destructive-foreground grid place-items-center"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <Label className="text-sm">Controla estoque</Label>
                  <p className="text-xs text-muted-foreground">Bloqueia venda quando zerar</p>
                </div>
                <Switch
                  checked={form.controla_estoque}
                  onCheckedChange={(v) => setForm({ ...form, controla_estoque: v })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="estoque">Estoque</Label>
                <Input
                  id="estoque"
                  type="number"
                  min="0"
                  value={form.estoque}
                  onChange={(e) => setForm({ ...form, estoque: e.target.value })}
                  disabled={!form.controla_estoque}
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label className="text-sm">Produto ativo</Label>
                <p className="text-xs text-muted-foreground">Aparece na loja quando ativo</p>
              </div>
              <Switch checked={form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: v })} />
            </div>

            {form.id && (
              <div className="space-y-1.5 rounded-md border p-3 bg-muted/30">
                <Label className="text-sm flex items-center gap-1.5">
                  <Link2 className="h-3.5 w-3.5" />
                  Link direto do produto
                </Label>
                <p className="text-xs text-muted-foreground">
                  Compartilhe este link em redes sociais — ao clicar, o produto abre direto na loja.
                </p>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={`${typeof window !== "undefined" ? window.location.origin : ""}/?produto=${form.id}`}
                    onFocus={(e) => e.currentTarget.select()}
                    className="font-mono text-xs"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={async () => {
                      const url = `${window.location.origin}/?produto=${form.id}`;
                      try {
                        await navigator.clipboard.writeText(url);
                        toast.success("Link copiado!");
                      } catch {
                        toast.error("Não foi possível copiar");
                      }
                    }}
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    Copiar
                  </Button>
                </div>
              </div>
            )}
          </div>


          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
