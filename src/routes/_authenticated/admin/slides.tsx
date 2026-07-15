import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Trash2, GripVertical } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/slides")({
  component: SlidesAdmin,
});

type Slide = {
  id: string;
  imagem_url: string;
  link_url: string | null;
  ordem: number;
  ativo: boolean;
  intervalo_segundos: number | null;
};

function SlidesAdmin() {
  const qc = useQueryClient();
  const [imagem, setImagem] = useState("");
  const [link, setLink] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: slides, isLoading } = useQuery({
    queryKey: ["admin-slides"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("home_slides")
        .select("*")
        .order("ordem", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Slide[];
    },
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-slides"] });
    qc.invalidateQueries({ queryKey: ["home-slides"] });
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imagem.trim()) return toast.error("Informe a URL da imagem");
    setSaving(true);
    const nextOrdem = (slides?.length ?? 0) + 1;
    const { error } = await supabase.from("home_slides").insert({
      imagem_url: imagem.trim(),
      link_url: link.trim() || null,
      ordem: nextOrdem,
      ativo: true,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Slide adicionado");
    setImagem("");
    setLink("");
    refresh();
  };

  const toggleAtivo = async (s: Slide) => {
    const { error } = await supabase
      .from("home_slides")
      .update({ ativo: !s.ativo })
      .eq("id", s.id);
    if (error) return toast.error(error.message);
    refresh();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir este slide?")) return;
    const { error } = await supabase.from("home_slides").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Slide removido");
    refresh();
  };

  const move = async (s: Slide, dir: -1 | 1) => {
    const list = [...(slides ?? [])];
    const idx = list.findIndex((x) => x.id === s.id);
    const swap = idx + dir;
    if (swap < 0 || swap >= list.length) return;
    const other = list[swap];
    await supabase.from("home_slides").update({ ordem: other.ordem }).eq("id", s.id);
    await supabase.from("home_slides").update({ ordem: s.ordem }).eq("id", other.id);
    refresh();
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Adicionar slide</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="grid gap-4 md:grid-cols-[1fr_1fr_auto] items-end">
            <div className="space-y-1">
              <Label>URL da imagem</Label>
              <Input
                placeholder="https://..."
                value={imagem}
                onChange={(e) => setImagem(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Link (opcional)</Label>
              <Input
                placeholder="https://..."
                value={link}
                onChange={(e) => setLink(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? "Salvando..." : "Adicionar"}
            </Button>
          </form>
          <p className="text-xs text-muted-foreground mt-3">
            Recomendado: imagens em formato paisagem (1600x250) ou similar. Aparecem no topo da loja em 250px de altura.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Slides cadastrados</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
          {!isLoading && (slides?.length ?? 0) === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum slide cadastrado ainda.</p>
          )}
          <ul className="space-y-3">
            {slides?.map((s) => (
              <li key={s.id} className="flex items-center gap-3 border rounded-lg p-3">
                <div className="flex flex-col">
                  <button
                    onClick={() => move(s, -1)}
                    className="text-xs px-1 hover:bg-muted rounded"
                    aria-label="Subir"
                  >
                    ▲
                  </button>
                  <GripVertical className="h-3 w-3 text-muted-foreground mx-auto" />
                  <button
                    onClick={() => move(s, 1)}
                    className="text-xs px-1 hover:bg-muted rounded"
                    aria-label="Descer"
                  >
                    ▼
                  </button>
                </div>
                <img
                  src={s.imagem_url}
                  alt="slide"
                  className="h-16 w-32 object-cover rounded border bg-muted"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground truncate">{s.imagem_url}</p>
                  {s.link_url && (
                    <p className="text-xs text-primary truncate">→ {s.link_url}</p>
                  )}
                  <p className="text-xs text-muted-foreground">Ordem: {s.ordem}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs">Ativo</Label>
                  <Switch checked={s.ativo} onCheckedChange={() => toggleAtivo(s)} />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(s.id)}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
