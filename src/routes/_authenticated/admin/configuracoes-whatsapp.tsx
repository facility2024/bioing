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
import { Loader2, MessageCircle, ExternalLink, PlugZap, Power, Send } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/admin/configuracoes-whatsapp")({
  component: ConfigWhatsappPage,
});

type Config = {
  id: string;
  instance_id: string | null;
  api_token: string | null;
  numero_conectado: string | null;
  numero_alerta_estoque: string | null;
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
  const [numeroAlerta, setNumeroAlerta] = useState("");
  const [ativa, setAtiva] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [testMessage, setTestMessage] = useState(
    "🚀 Mensagem de teste da sua loja — a integração com o WhatsApp está funcionando!",
  );
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (data) {
      setInstanceId(data.instance_id ?? "");
      setApiToken(data.api_token ?? "");
      setNumero(data.numero_conectado ?? "");
      setNumeroAlerta(data.numero_alerta_estoque ?? "");
      setAtiva(data.ativa);
    }
  }, [data]);

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      instance_id: instanceId.trim() || null,
      api_token: apiToken.trim() || null,
      numero_conectado: numero.trim() || null,
      numero_alerta_estoque: numeroAlerta.trim() || null,
      ativa,
    };
    let error;
    if (data?.id) {
      const res = await supabase
        .from("configuracoes_whatsapp")
        .update(payload)
        .eq("id", data.id)
        .select()
        .maybeSingle();
      error = res.error;
      if (!error && !res.data) {
        error = { message: "Sem permissão para salvar (verifique se você é admin)." } as any;
      }
    } else {
      const res = await supabase
        .from("configuracoes_whatsapp")
        .insert(payload)
        .select()
        .maybeSingle();
      error = res.error;
    }
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

  const handleSendTest = async () => {
    if (!instanceId || !apiToken) {
      toast.error("Informe o Instance ID e o Token da API");
      return;
    }
    const phone = testPhone.replace(/\D/g, "");
    if (phone.length < 10) {
      toast.error("Informe um número válido com DDD (ex.: 5511999999999)");
      return;
    }
    if (!testMessage.trim()) {
      toast.error("Escreva a mensagem de teste");
      return;
    }
    setSending(true);
    try {
      const res = await fetch(
        `${WAPI_BASE}/message/send-text?instanceId=${encodeURIComponent(instanceId)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiToken}`,
          },
          body: JSON.stringify({ phone, message: testMessage, delayMessage: 1 }),
        },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.error) {
        throw new Error(json?.message || json?.error || `HTTP ${res.status}`);
      }
      toast.success(`Mensagem enviada para ${phone}`);
    } catch (e) {
      toast.error("Falha ao enviar: " + (e as Error).message);
    } finally {
      setSending(false);
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

          <div className="space-y-2 rounded-lg border border-dashed p-4 bg-muted/30">
            <Label htmlFor="numero-alerta" className="text-sm font-medium">
              📦 Número oficial para alertas de estoque
            </Label>
            <Input
              id="numero-alerta"
              placeholder="Ex.: 5511999999999"
              value={numeroAlerta}
              onChange={(e) => setNumeroAlerta(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Número do WhatsApp que receberá as notificações de estoque baixo (≤ 3 unidades).
              Se ficar vazio, o alerta é enviado para o próprio número conectado à instância.
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Send className="h-4 w-4" /> Enviar mensagem de teste
          </CardTitle>
          <CardDescription>
            Envie uma mensagem para um número seu para confirmar que a integração está funcionando.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="test-phone">Número de destino (com DDI + DDD)</Label>
            <Input
              id="test-phone"
              placeholder="Ex.: 5511999999999"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="test-message">Mensagem</Label>
            <Textarea
              id="test-message"
              rows={3}
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
            />
          </div>
          <Button onClick={handleSendTest} disabled={sending}>
            {sending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Enviar mensagem de teste
          </Button>
          <p className="text-xs text-muted-foreground">
            Usa o Instance ID e o Token preenchidos acima. Não precisa salvar antes de testar.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
