import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/configuracoes-loja")({
  component: ConfigLojaAdmin,
});

type Config = {
  id?: string;
  nome_empresa: string;
  logo_url: string;
  whatsapp_atendimento: string;
  email_contato: string;
  cor_primaria: string;
  cor_botoes: string;
  cor_header: string;
  cor_background: string;
  cor_texto_botoes: string;
  rodape_texto: string;
  rodape_cnpj: string;
  rodape_endereco: string;
  rodape_email: string;
  rodape_telefone: string;
};

const empty: Config = {
  nome_empresa: "",
  logo_url: "",
  whatsapp_atendimento: "",
  email_contato: "",
  cor_primaria: "#248f8d",
  cor_botoes: "#248f8d",
  cor_header: "#397c2f",
  cor_background: "#ffffff",
  cor_texto_botoes: "#ffffff",
  rodape_texto: "",
  rodape_cnpj: "",
  rodape_endereco: "",
  rodape_email: "",
  rodape_telefone: "",
};

function ConfigLojaAdmin() {
  const qc = useQueryClient();
  const [form, setForm] = useState<Config>(empty);
  const [saving, setSaving] = useState(false);

  const { data } = useQuery({
    queryKey: ["admin-config-loja"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("configuracoes_empresa")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (data) {
      setForm({
        ...empty,
        ...Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v ?? empty[k as keyof Config] ?? ""])),
      } as Config);
    }
  }, [data]);

  const set = <K extends keyof Config>(k: K, v: Config[K]) => setForm((f) => ({ ...f, [k]: v }));

  const salvar = async () => {
    setSaving(true);
    const payload = { ...form };
    const { error } = form.id
      ? await supabase.from("configuracoes_empresa").update(payload as any).eq("id", form.id)
      : await supabase.from("configuracoes_empresa").insert(payload as any);
    setSaving(false);
    if (error) return toast.error("Erro: " + error.message);
    toast.success("Configurações salvas");
    qc.invalidateQueries({ queryKey: ["admin-config-loja"] });
    qc.invalidateQueries({ queryKey: ["config-loja"] });
  };

  const Color = ({ label, k }: { label: string; k: keyof Config }) => (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex gap-2 items-center">
        <input
          type="color"
          value={(form[k] as string) || "#000000"}
          onChange={(e) => set(k, e.target.value as any)}
          className="h-10 w-14 rounded border cursor-pointer bg-transparent"
        />
        <Input value={(form[k] as string) || ""} onChange={(e) => set(k, e.target.value as any)} placeholder="#000000" />
      </div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Configurações da Loja</h2>
        <p className="text-sm text-muted-foreground">Cores, identidade e informações do rodapé.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Identidade</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label>Nome da empresa</Label>
            <Input value={form.nome_empresa} onChange={(e) => set("nome_empresa", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Logo (URL)</Label>
            <Input value={form.logo_url} onChange={(e) => set("logo_url", e.target.value)} placeholder="https://..." />
            {form.logo_url && <img src={form.logo_url} alt="" className="mt-2 h-16 w-16 object-contain rounded bg-white p-1 border" />}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>WhatsApp</Label>
              <Input value={form.whatsapp_atendimento} onChange={(e) => set("whatsapp_atendimento", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>E-mail</Label>
              <Input value={form.email_contato} onChange={(e) => set("email_contato", e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Cores do layout</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Color label="Cor primária" k="cor_primaria" />
          <Color label="Cor dos botões" k="cor_botoes" />
          <Color label="Cor do texto dos botões" k="cor_texto_botoes" />
          <Color label="Cor do topo (header)" k="cor_header" />
          <Color label="Fundo do site (background)" k="cor_background" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Rodapé</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label>Texto/razão social</Label>
            <Textarea rows={2} value={form.rodape_texto} onChange={(e) => set("rodape_texto", e.target.value)} placeholder="BIOCON DO BRASIL PRODUTOS E SERVICOS LTDA - ME" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>CNPJ</Label>
              <Input value={form.rodape_cnpj} onChange={(e) => set("rodape_cnpj", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Telefone</Label>
              <Input value={form.rodape_telefone} onChange={(e) => set("rodape_telefone", e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Endereço</Label>
            <Input value={form.rodape_endereco} onChange={(e) => set("rodape_endereco", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>E-mail</Label>
            <Input value={form.rodape_email} onChange={(e) => set("rodape_email", e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Button onClick={salvar} disabled={saving} size="lg">
        {saving ? "Salvando..." : "Salvar configurações"}
      </Button>
    </div>
  );
}
