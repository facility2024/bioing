import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, MessageCircle, Send } from "lucide-react";
import { useCart, formatBRL } from "@/hooks/use-cart";
import { finalizarPedidoWhatsapp } from "@/lib/checkout.functions";
import { toast } from "sonner";

export function CheckoutDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { items, total, clear } = useCart();
  const finalizar = useServerFn(finalizarPedidoWhatsapp);

  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [endereco, setEndereco] = useState("");
  const [cidade, setCidade] = useState("");
  const [cep, setCep] = useState("");
  const [obs, setObs] = useState("");
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);

  const reset = () => {
    setNome("");
    setTelefone("");
    setEmail("");
    setEndereco("");
    setCidade("");
    setCep("");
    setObs("");
    setSuccess(false);
  };

  const handleClose = (v: boolean) => {
    if (!v && success) {
      clear();
      reset();
    }
    onOpenChange(v);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return toast.error("Informe seu nome");
    if (telefone.replace(/\D/g, "").length < 10) return toast.error("Telefone inválido (com DDD)");
    setSending(true);
    try {
      await finalizar({
        data: {
          cliente: {
            nome: nome.trim(),
            telefone: telefone.trim(),
            email: email.trim() || undefined,
            endereco: endereco.trim() || undefined,
            cidade: cidade.trim() || undefined,
            cep: cep.trim() || undefined,
            observacoes: obs.trim() || undefined,
          },
          itens: items.map((it) => ({ nome: it.nome, preco: it.preco, quantidade: it.quantidade })),
          total,
        },
      });
      setSuccess(true);
    } catch (err) {
      toast.error("Erro ao enviar pedido: " + (err as Error).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
        {success ? (
          <div className="py-6 text-center space-y-4">
            <div className="mx-auto w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <DialogHeader>
              <DialogTitle className="text-center">Pedido enviado! 🎉</DialogTitle>
              <DialogDescription className="text-center">
                Seu pedido foi encaminhado para o WhatsApp do nosso atendimento e uma confirmação
                também foi enviada para o seu WhatsApp <strong>agora mesmo</strong>.
              </DialogDescription>
            </DialogHeader>
            <div className="rounded-lg border bg-muted/40 p-4 text-left text-sm space-y-2">
              <div className="flex items-center gap-2 font-medium">
                <MessageCircle className="h-4 w-4 text-emerald-600" />
                Pode abrir o seu WhatsApp
              </div>
              <p className="text-muted-foreground">
                O atendente já está lá esperando você para finalizar tudo. Basta abrir o app e
                continuar a conversa por lá. 🚀
              </p>
            </div>
            <Button className="w-full" onClick={() => handleClose(false)}>
              Fechar
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Finalizar pedido</DialogTitle>
              <DialogDescription>
                Preencha seus dados para enviarmos seu pedido pelo WhatsApp.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-1 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="c-nome">Nome completo *</Label>
                  <Input id="c-nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="c-tel">WhatsApp *</Label>
                    <Input
                      id="c-tel"
                      placeholder="5511999999999"
                      value={telefone}
                      onChange={(e) => setTelefone(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="c-email">E-mail</Label>
                    <Input
                      id="c-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="c-end">Endereço</Label>
                  <Input
                    id="c-end"
                    placeholder="Rua, número, bairro"
                    value={endereco}
                    onChange={(e) => setEndereco(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="c-cid">Cidade / UF</Label>
                    <Input id="c-cid" value={cidade} onChange={(e) => setCidade(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="c-cep">CEP</Label>
                    <Input id="c-cep" value={cep} onChange={(e) => setCep(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="c-obs">Observações</Label>
                  <Textarea id="c-obs" rows={2} value={obs} onChange={(e) => setObs(e.target.value)} />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border bg-muted/40 p-3">
                <span className="text-sm text-muted-foreground">Total do pedido</span>
                <span className="text-lg font-bold">{formatBRL(total)}</span>
              </div>

              <Button type="submit" size="lg" className="w-full bg-header text-white hover:bg-header/90" disabled={sending || items.length === 0}>
                {sending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Enviar pedido pelo WhatsApp
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
