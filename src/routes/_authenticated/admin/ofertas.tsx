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

function OfertasAdmin() {
  const qc = useQueryClient();
  const [form, setForm] = useState<Oferta>(empty);
  const [saving, setSaving] = useState(false);

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
        </CardContent>
      </Card>

      <Button onClick={salvar} disabled={saving} size="lg">
        {saving ? "Salvando..." : "Salvar oferta"}
      </Button>
    </div>
  );
}
