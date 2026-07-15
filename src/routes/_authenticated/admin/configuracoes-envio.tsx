import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/configuracoes-envio")({
  component: ConfigEnvio,
});

type Envio = {
  id?: string;
  cep_origem: string;
  usa_pac: boolean;
  usa_sedex: boolean;
  peso_padrao_kg: number;
  altura_cm: number;
  largura_cm: number;
  comprimento_cm: number;
  prazo_adicional_dias: number;
  frete_gratis_acima: number | null;
  frete_fixo: number | null;
  delay_segundos: number;
};

const empty: Envio = {
  cep_origem: "",
  usa_pac: true,
  usa_sedex: true,
  peso_padrao_kg: 0.3,
  altura_cm: 4,
  largura_cm: 12,
  comprimento_cm: 17,
  prazo_adicional_dias: 1,
  frete_gratis_acima: null,
  frete_fixo: null,
  delay_segundos: 0,
};

function ConfigEnvio() {
  const qc = useQueryClient();
  const [form, setForm] = useState<Envio>(empty);
  const [saving, setSaving] = useState(false);

  const { data } = useQuery({
    queryKey: ["admin-config-envio"],
    queryFn: async () => {
      const { data, error } = await supabase.from("configuracoes_envio").select("*").limit(1).maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  useEffect(() => {
    if (data) setForm({ ...empty, ...data });
  }, [data]);

  const set = <K extends keyof Envio>(k: K, v: Envio[K]) => setForm((f) => ({ ...f, [k]: v }));

  const salvar = async () => {
    setSaving(true);
    const payload = {
      cep_origem: form.cep_origem.replace(/\D/g, "") || null,
      usa_pac: form.usa_pac,
      usa_sedex: form.usa_sedex,
      peso_padrao_kg: Number(form.peso_padrao_kg) || 0.3,
      altura_cm: Number(form.altura_cm) || 4,
      largura_cm: Number(form.largura_cm) || 12,
      comprimento_cm: Number(form.comprimento_cm) || 17,
      prazo_adicional_dias: Number(form.prazo_adicional_dias) || 0,
      frete_gratis_acima: form.frete_gratis_acima != null && form.frete_gratis_acima !== ("" as any) ? Number(form.frete_gratis_acima) : null,
      frete_fixo: form.frete_fixo != null && form.frete_fixo !== ("" as any) ? Number(form.frete_fixo) : null,
      delay_segundos: Number(form.delay_segundos) || 0,
    };
    const { error } = form.id
      ? await supabase.from("configuracoes_envio").update(payload).eq("id", form.id)
      : await supabase.from("configuracoes_envio").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Configurações de envio salvas");
    qc.invalidateQueries({ queryKey: ["admin-config-envio"] });
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Configurações de Envio</h2>
        <p className="text-sm text-muted-foreground">
          Dados usados para calcular o frete via Correios (PAC/SEDEX) e para preencher a etiqueta de envio.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Endereço de origem</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label>CEP de origem *</Label>
            <Input
              value={form.cep_origem}
              onChange={(e) => set("cep_origem", e.target.value)}
              placeholder="13180-310"
              maxLength={9}
            />
            <p className="text-[11px] text-muted-foreground">CEP de onde os produtos serão despachados.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Serviços dos Correios</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <Label className="text-sm">PAC</Label>
              <p className="text-xs text-muted-foreground">Modalidade econômica</p>
            </div>
            <Switch checked={form.usa_pac} onCheckedChange={(v) => set("usa_pac", v)} />
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <Label className="text-sm">SEDEX</Label>
              <p className="text-xs text-muted-foreground">Modalidade expressa</p>
            </div>
            <Switch checked={form.usa_sedex} onCheckedChange={(v) => set("usa_sedex", v)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Dimensões padrão da embalagem</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="space-y-1.5">
            <Label>Peso (kg)</Label>
            <Input type="number" step="0.1" value={form.peso_padrao_kg} onChange={(e) => set("peso_padrao_kg", Number(e.target.value))} />
          </div>
          <div className="space-y-1.5">
            <Label>Altura (cm)</Label>
            <Input type="number" value={form.altura_cm} onChange={(e) => set("altura_cm", Number(e.target.value))} />
          </div>
          <div className="space-y-1.5">
            <Label>Largura (cm)</Label>
            <Input type="number" value={form.largura_cm} onChange={(e) => set("largura_cm", Number(e.target.value))} />
          </div>
          <div className="space-y-1.5">
            <Label>Comprimento (cm)</Label>
            <Input type="number" value={form.comprimento_cm} onChange={(e) => set("comprimento_cm", Number(e.target.value))} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Regras de frete</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label>Prazo adicional (dias)</Label>
            <Input type="number" value={form.prazo_adicional_dias} onChange={(e) => set("prazo_adicional_dias", Number(e.target.value))} />
            <p className="text-[11px] text-muted-foreground">Somados ao prazo dos Correios</p>
          </div>
          <div className="space-y-1.5">
            <Label>Frete grátis acima de (R$)</Label>
            <Input
              type="number"
              step="0.01"
              value={form.frete_gratis_acima ?? ""}
              onChange={(e) => set("frete_gratis_acima", e.target.value === "" ? null : Number(e.target.value))}
              placeholder="Ex.: 199,00"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Frete fixo (R$)</Label>
            <Input
              type="number"
              step="0.01"
              value={form.frete_fixo ?? ""}
              onChange={(e) => set("frete_fixo", e.target.value === "" ? null : Number(e.target.value))}
              placeholder="Opcional"
            />
            <p className="text-[11px] text-muted-foreground">Se preenchido, ignora cálculo dos Correios</p>
          </div>
        </CardContent>
      </Card>

      <Button onClick={salvar} disabled={saving} size="lg">
        {saving ? "Salvando..." : "Salvar configurações"}
      </Button>
    </div>
  );
}
