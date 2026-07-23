import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Tags } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/categorias")({
  component: CategoriasAdmin,
});

type Categoria = {
  id: string;
  nome: string;
  slug: string;
  ativo: boolean;
  ordem: number;
  created_at: string;
};

const emptyForm = {
  id: "" as string | null,
  nome: "",
  slug: "",
  ativo: true,
  ordem: "0",
};

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function CategoriasAdmin() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const { data: categorias, isLoading, isError } = useQuery({
    queryKey: ["admin-categorias"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categorias")
        .select("id, nome, slug, ativo, ordem, created_at")
        .order("ordem", { ascending: true })
        .order("nome", { ascending: true });
      if (error) throw error;
      return data as Categoria[];
    },
  });

  const proximaOrdem = useMemo(() => {
    const maior = Math.max(0, ...(categorias ?? []).map((c) => Number(c.ordem) || 0));
    return String(maior + 1);
  }, [categorias]);

  const openNew = () => {
    setForm({ ...emptyForm, ordem: proximaOrdem });
    setOpen(true);
  };

  const openEdit = (categoria: Categoria) => {
    setForm({
      id: categoria.id,
      nome: categoria.nome,
      slug: categoria.slug,
      ativo: categoria.ativo,
      ordem: String(categoria.ordem ?? 0),
    });
    setOpen(true);
  };

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-categorias"] });
    qc.invalidateQueries({ queryKey: ["admin-categorias-list"] });
    qc.invalidateQueries({ queryKey: ["produtos-loja"] });
  };

  const handleSave = async () => {
    const nome = form.nome.trim();
    const slug = (form.slug.trim() || slugify(nome)).trim();
    const ordem = Number(form.ordem) || 0;

    if (!nome) {
      toast.error("Informe o nome da categoria");
      return;
    }
    if (!slug) {
      toast.error("Informe um slug válido");
      return;
    }

    setSaving(true);
    const payload = { nome, slug, ativo: form.ativo, ordem };
    const { error } = form.id
      ? await supabase.from("categorias").update(payload).eq("id", form.id)
      : await supabase.from("categorias").insert(payload);
    setSaving(false);

    if (error) {
      const duplicated = error.message.toLowerCase().includes("duplicate") || error.code === "23505";
      toast.error(duplicated ? "Já existe uma categoria com esse slug." : `Erro ao salvar: ${error.message}`);
      return;
    }

    toast.success(form.id ? "Categoria atualizada" : "Categoria criada");
    setOpen(false);
    refresh();
  };

  const toggleActive = async (categoria: Categoria) => {
    const { error } = await supabase
      .from("categorias")
      .update({ ativo: !categoria.ativo })
      .eq("id", categoria.id);
    if (error) {
      toast.error(`Erro ao atualizar: ${error.message}`);
      return;
    }
    toast.success(categoria.ativo ? "Categoria ocultada" : "Categoria ativada");
    refresh();
  };

  const handleDelete = async (categoria: Categoria) => {
    if (!confirm(`Excluir a categoria "${categoria.nome}"? Os produtos vinculados ficarão sem categoria.`)) return;
    const { error } = await supabase.from("categorias").delete().eq("id", categoria.id);
    if (error) {
      toast.error(`Erro ao excluir: ${error.message}`);
      return;
    }
    toast.success("Categoria excluída");
    refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Categorias</h2>
          <p className="text-sm text-muted-foreground">Organize seus produtos em categorias.</p>
        </div>
        <Button onClick={openNew}>
          <Plus className="mr-2 h-4 w-4" />
          Nova categoria
        </Button>
      </div>

      {isError && (
        <Card>
          <CardContent className="py-12 text-center text-sm text-destructive">
            Erro ao carregar categorias. Verifique sua permissão de administrador.
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">Carregando...</CardContent>
        </Card>
      ) : !categorias || categorias.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center space-y-3">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-muted text-muted-foreground">
              <Tags className="h-6 w-6" />
            </div>
            <p className="text-sm text-muted-foreground">Nenhuma categoria cadastrada ainda.</p>
            <Button onClick={openNew} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Cadastrar categoria
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {categorias.map((categoria) => (
            <Card key={categoria.id}>
              <CardContent className="p-4 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold truncate">{categoria.nome}</h3>
                      <Badge variant={categoria.ativo ? "default" : "secondary"}>
                        {categoria.ativo ? "Ativa" : "Inativa"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 truncate">/{categoria.slug}</p>
                    <p className="text-xs text-muted-foreground mt-1">Ordem: {categoria.ordem}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Switch checked={categoria.ativo} onCheckedChange={() => toggleActive(categoria)} />
                    Visível na loja
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => openEdit(categoria)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(categoria)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar categoria" : "Nova categoria"}</DialogTitle>
            <DialogDescription className="sr-only">Formulário de categoria</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="categoria-nome">Nome *</Label>
              <Input
                id="categoria-nome"
                value={form.nome}
                onChange={(e) => {
                  const nome = e.target.value;
                  setForm((current) => ({
                    ...current,
                    nome,
                    slug: current.id ? current.slug : slugify(nome),
                  }));
                }}
                placeholder="Ex.: Aromas em pó"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="categoria-slug">Slug</Label>
                <Input
                  id="categoria-slug"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })}
                  placeholder="aromas-em-po"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="categoria-ordem">Ordem</Label>
                <Input
                  id="categoria-ordem"
                  type="number"
                  value={form.ordem}
                  onChange={(e) => setForm({ ...form, ordem: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label className="text-sm">Categoria ativa</Label>
                <p className="text-xs text-muted-foreground">Categorias ativas ficam disponíveis nos produtos.</p>
              </div>
              <Switch checked={form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Salvar categoria"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
