import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, MessageCircle, ExternalLink, PlugZap, Power } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/configuracoes-whatsapp")({
  component: ConfigWhatsappPage,
});

type Config = {
  id: string;
  instance_id: string | null;
  api_token: string | null;
  numero_conectado: string | null;
  ativa: boolean;
};

const WAPI_BASE = "https://api.w-api.app/v1";

function ConfigWhatsappPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["configuracoes_whatsapp"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("configuracoes_whatsapp")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as Config | null;
    },
  });

  const [instanceId, setInstanceId] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [numero, setNumero] = useState("");
  const [ativa, setAtiva] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (data) {
      setInstanceId(data.instance_id ?? "");
      setApiToken(data.api_token ?? "");
      setNumero(data.numero_conectado ?? "");
      setAtiva(data.ativa);
    }
  }, [data]);

  const handleSave = async () => {
    if (!data?.id) return;
    setSaving(true);
    const { error } = await supabase
      .from("configuracoes_whatsapp")
      .update({
        instance_id: instanceId.trim() || null,
        api_token: apiToken.trim() || null,
        numero_conectado: numero.trim() || null,
        ativa,
      })
      .eq("id", data.id);
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
      return;
    }
    toast.success("Configurações salvas");
    qc.invalidateQueries({ queryKey: ["configuracoes_whatsapp"] });
  };

  const handleTest = async () => {
    if (!instanceId || !apiToken) {
      toast.error("Informe o Instance ID e o Token da API");
      return;
    }
    setTesting(true);
    try {
      const res = await fetch(
        `${WAPI_BASE}/instance/status-instance?instanceId=${encodeURIComponent(instanceId)}`,
        { headers: { Authorization: `Bearer ${apiToken}` } },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || `HTTP ${res.status}`);
      const connected =
        json?.connected === true ||
        json?.status === "connected" ||
        json?.instance?.status === "connected";
      const phone =
        json?.phone ||
        json?.instance?.phone ||
        json?.instance?.wid ||
        json?.wid ||
        "";
      if (phone) setNumero(String(phone));
      toast.success(
        connected
          ? `Instância conectada${phone ? ` (${phone})` : ""}`
          : "Instância respondeu, mas não está conectada",
      );
    } catch (e) {
      toast.error("Falha ao consultar W-API: " + (e as Error).message);
    } finally {
      setTesting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <MessageCircle className="h-5 w-5" /> Configurações do WhatsApp (W-API)
          </h2>
          <p className="text-sm text-muted-foreground">
            Conecte sua instância da W-API para enviar pedidos e notificações.
          </p>
        </div>
        <Badge variant={ativa ? "default" : "secondary"} className="shrink-0">
          <Power className="mr-1 h-3 w-3" />
          {ativa ? "Ativa" : "Inativa"}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Credenciais da instância</CardTitle>
          <CardDescription>
            Encontre estes dados em{" "}
            <a
              href="https://painel.w-api.app/app/api-keys"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              painel.w-api.app/app/api-keys <ExternalLink className="h-3 w-3" />
            </a>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="instance">Instance ID</Label>
            <Input
              id="instance"
              placeholder="Ex.: 3ABC1234..."
              value={instanceId}
              onChange={(e) => setInstanceId(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="token">Token da API</Label>
            <Input
              id="token"
              type="password"
              placeholder="Token gerado no painel da W-API"
              value={apiToken}
              onChange={(e) => setApiToken(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="numero">Número conectado à instância</Label>
            <Input
              id="numero"
              placeholder="Ex.: 5511999999999"
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Este é o número que está logado na instância. Pode ser trocado escaneando um novo QR Code no painel da W-API — atualize aqui após a troca.
            </p>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="ativa" className="text-sm font-medium">
                Ativar instância
              </Label>
              <p className="text-xs text-muted-foreground">
                Quando ativa, o sistema usa esta instância para enviar mensagens.
              </p>
            </div>
            <Switch id="ativa" checked={ativa} onCheckedChange={setAtiva} />
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
            <Button variant="outline" onClick={handleTest} disabled={testing}>
              {testing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <PlugZap className="mr-2 h-4 w-4" />
              )}
              Testar conexão
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
