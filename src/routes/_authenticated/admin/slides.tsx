import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  secao: number;
};

type Secao = { numero: number; titulo: string; ativo: boolean; imagem_url: string | null };

const SECOES = [1, 2, 3, 4] as const;

function SlidesAdmin() {
  const qc = useQueryClient();
  const [imagem, setImagem] = useState("");
  const [link, setLink] = useState("");
  const [intervalo, setIntervalo] = useState("5");
  const [secao, setSecao] = useState<number>(1);
  const [saving, setSaving] = useState(false);

  const { data: slides, isLoading } = useQuery({
    queryKey: ["admin-slides"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("home_slides")
        .select("*")
        .order("secao", { ascending: true })
        .order("ordem", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Slide[];
    },
  });

  const { data: secoes } = useQuery({
    queryKey: ["admin-home-secoes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("home_secoes")
        .select("numero, titulo, ativo, imagem_url")
        .order("numero");
      if (error) throw error;
      return (data ?? []) as Secao[];
    },
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-slides"] });
    qc.invalidateQueries({ queryKey: ["home-slides"] });
    qc.invalidateQueries({ queryKey: ["admin-home-secoes"] });
    qc.invalidateQueries({ queryKey: ["home-secoes"] });
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imagem.trim()) return toast.error("Informe a URL da imagem");
    setSaving(true);
    const daSecao = (slides ?? []).filter((s) => s.secao === secao);
    const nextOrdem = daSecao.length + 1;
    const secs = Math.max(1, parseInt(intervalo, 10) || 5);
    const { error } = await supabase.from("home_slides").insert({
      imagem_url: imagem.trim(),
      link_url: link.trim() || null,
      ordem: nextOrdem,
      ativo: true,
      intervalo_segundos: secs,
      secao,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Slide adicionado");
    setImagem("");
    setLink("");
    setIntervalo("5");
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

  const changeSecao = async (s: Slide, novaSecao: number) => {
    if (novaSecao === s.secao) return;
    const daNova = (slides ?? []).filter((x) => x.secao === novaSecao);
    const { error } = await supabase
      .from("home_slides")
      .update({ secao: novaSecao, ordem: daNova.length + 1 })
      .eq("id", s.id);
    if (error) return toast.error(error.message);
    toast.success("Seção alterada");
    refresh();
  };

  const move = async (s: Slide, dir: -1 | 1) => {
    const list = (slides ?? []).filter((x) => x.secao === s.secao);
    const idx = list.findIndex((x) => x.id === s.id);
    const swap = idx + dir;
    if (swap < 0 || swap >= list.length) return;
    const other = list[swap];
    const tempOrdem = -Date.now();
    const r1 = await supabase.from("home_slides").update({ ordem: tempOrdem }).eq("id", s.id);
    if (r1.error) return toast.error("Erro ao reordenar: " + r1.error.message);
    const r2 = await supabase.from("home_slides").update({ ordem: s.ordem }).eq("id", other.id);
    if (r2.error) return toast.error("Erro ao reordenar: " + r2.error.message);
    const r3 = await supabase.from("home_slides").update({ ordem: other.ordem }).eq("id", s.id);
    if (r3.error) return toast.error("Erro ao reordenar: " + r3.error.message);
    refresh();
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <Card>
        <CardHeader>
          <CardTitle>Títulos das seções</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">
            Cada seção exibe: banner (slides desta seção) + título + produtos vinculados. A ordem na home é 1 → 2 → 3 → 4.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {(secoes ?? []).map((s) => (
              <div key={s.numero} className="flex flex-col gap-2 border rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground w-16 shrink-0">
                    Seção {s.numero}
                  </span>
                  <Input
                    defaultValue={s.titulo}
                    placeholder={`Ex: Aromas Doces`}
                    className="h-9"
                    onBlur={async (e) => {
                      const v = e.target.value.trim();
                      if (v === s.titulo) return;
                      const { error } = await supabase
                        .from("home_secoes")
                        .update({ titulo: v })
                        .eq("numero", s.numero);
                      if (error) return toast.error(error.message);
                      toast.success(`Seção ${s.numero} atualizada`);
                      refresh();
                    }}
                  />
                  <div className="flex items-center gap-1.5">
                    <Label className="text-xs">Ativa</Label>
                    <Switch
                      checked={s.ativo}
                      onCheckedChange={async (v) => {
                        const { error } = await supabase
                          .from("home_secoes")
                          .update({ ativo: v })
                          .eq("numero", s.numero);
                        if (error) return toast.error(error.message);
                        refresh();
                      }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground w-16 shrink-0">
                    Imagem
                  </span>
                  {s.imagem_url ? (
                    <img
                      src={s.imagem_url}
                      alt=""
                      className="h-9 w-9 object-cover rounded border bg-muted shrink-0"
                    />
                  ) : (
                    <div className="h-9 w-9 rounded border bg-muted shrink-0" />
                  )}
                  <Input
                    defaultValue={s.imagem_url ?? ""}
                    placeholder="URL da imagem (opcional)"
                    className="h-9"
                    onBlur={async (e) => {
                      const v = e.target.value.trim() || null;
                      if (v === (s.imagem_url ?? null)) return;
                      const { error } = await supabase
                        .from("home_secoes")
                        .update({ imagem_url: v })
                        .eq("numero", s.numero);
                      if (error) return toast.error(error.message);
                      toast.success(`Imagem da seção ${s.numero} atualizada`);
                      refresh();
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Adicionar slide</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="grid gap-4 md:grid-cols-[1fr_1fr_120px_140px_auto] items-end">
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
            <div className="space-y-1">
              <Label>Seção</Label>
              <Select value={String(secao)} onValueChange={(v) => setSecao(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SECOES.map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      Seção {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Tempo (segundos)</Label>
              <Input
                type="number"
                min={1}
                value={intervalo}
                onChange={(e) => setIntervalo(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? "Salvando..." : "Adicionar"}
            </Button>
          </form>
          <p className="text-xs text-muted-foreground mt-3">
            Recomendado: imagens no formato <strong>1600x552 pixels</strong> (paisagem).
          </p>
        </CardContent>
      </Card>

      {SECOES.map((num) => {
        const daSecao = (slides ?? []).filter((s) => s.secao === num);
        const tituloSecao = (secoes ?? []).find((s) => s.numero === num)?.titulo || `Seção ${num}`;
        return (
          <Card key={num}>
            <CardHeader>
              <CardTitle className="text-base">
                Slides — Seção {num}
                {tituloSecao && (
                  <span className="text-muted-foreground font-normal"> · {tituloSecao}</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
              {!isLoading && daSecao.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhum slide nesta seção.</p>
              )}
              <ul className="space-y-3">
                {daSecao.map((s) => (
                  <li key={s.id} className="flex items-center gap-3 border rounded-lg p-3 flex-wrap">
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
                    <div className="flex-1 min-w-[240px] space-y-1">
                      <Input
                        key={`img-${s.id}-${s.imagem_url}`}
                        defaultValue={s.imagem_url}
                        placeholder="URL da imagem"
                        className="h-8 text-xs"
                        onBlur={async (e) => {
                          const v = e.target.value.trim();
                          if (!v || v === s.imagem_url) return;
                          const { error } = await supabase
                            .from("home_slides")
                            .update({ imagem_url: v })
                            .eq("id", s.id);
                          if (error) return toast.error(error.message);
                          toast.success("Imagem atualizada");
                          refresh();
                        }}
                      />
                      <Input
                        key={`link-${s.id}-${s.link_url ?? ""}`}
                        defaultValue={s.link_url ?? ""}
                        placeholder="Link (opcional)"
                        className="h-8 text-xs"
                        onBlur={async (e) => {
                          const v = e.target.value.trim() || null;
                          if (v === (s.link_url ?? null)) return;
                          const { error } = await supabase
                            .from("home_slides")
                            .update({ link_url: v })
                            .eq("id", s.id);
                          if (error) return toast.error(error.message);
                          toast.success("Link atualizado");
                          refresh();
                        }}
                      />
                      <p className="text-[11px] text-muted-foreground">Ordem: {s.ordem}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs whitespace-nowrap">Seção</Label>
                      <Select
                        value={String(s.secao)}
                        onValueChange={(v) => changeSecao(s, Number(v))}
                      >
                        <SelectTrigger className="h-8 w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SECOES.map((n) => (
                            <SelectItem key={n} value={String(n)}>
                              Seção {n}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs whitespace-nowrap">Tempo (s)</Label>
                      <Input
                        type="number"
                        min={1}
                        defaultValue={s.intervalo_segundos ?? 5}
                        className="h-8 w-20"
                        onBlur={async (e) => {
                          const v = Math.max(1, parseInt(e.target.value, 10) || 5);
                          if (v === (s.intervalo_segundos ?? 5)) return;
                          const { error } = await supabase
                            .from("home_slides")
                            .update({ intervalo_segundos: v })
                            .eq("id", s.id);
                          if (error) return toast.error(error.message);
                          toast.success("Tempo atualizado");
                          refresh();
                        }}
                      />
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
        );
      })}
    </div>
  );
}
