import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, ArrowRight, ArrowLeft, Truck, CreditCard, FileText, Copy } from "lucide-react";
import { useCart, formatBRL } from "@/hooks/use-cart";
import { criarPedidoPendente } from "@/lib/checkout.functions";
import { calcularFrete, type FreteOpcao } from "@/lib/frete.functions";
import { criarPagamentoMP, getMpPublicKey } from "@/lib/pagamento.functions";
import { toast } from "sonner";
import { initMercadoPago, Payment } from "@mercadopago/sdk-react";

type Step = "dados" | "frete" | "pagamento" | "sucesso";

let mpInitialized = false;

export function CheckoutDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { items, total: subtotal, clear } = useCart();
  const criarPedido = useServerFn(criarPedidoPendente);
  const calcFrete = useServerFn(calcularFrete);
  const pagar = useServerFn(criarPagamentoMP);
  const getPk = useServerFn(getMpPublicKey);

  const [step, setStep] = useState<Step>("dados");
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [rua, setRua] = useState("");
  const [numero, setNumero] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [cep, setCep] = useState("");
  const [obs, setObs] = useState("");

  const [loadingFrete, setLoadingFrete] = useState(false);
  const [opcoesFrete, setOpcoesFrete] = useState<FreteOpcao[]>([]);
  const [freteSel, setFreteSel] = useState<FreteOpcao | null>(null);

  const [pedido, setPedido] = useState<{ id: string; numero: string } | null>(null);
  const [pkReady, setPkReady] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [pixData, setPixData] = useState<{ qr_code: string; qr_code_base64: string; ticket_url: string } | null>(null);

  const total = subtotal + (freteSel?.preco ?? 0);

  // Inicializa MP quando abrir o passo pagamento
  useEffect(() => {
    if (step !== "pagamento" || mpInitialized) return;
    (async () => {
      try {
        const { publicKey } = await getPk();
        if (publicKey) {
          initMercadoPago(publicKey, { locale: "pt-BR" });
          mpInitialized = true;
          setPkReady(true);
        } else {
          toast.error("Chave pública Mercado Pago não configurada.");
        }
      } catch (e) {
        toast.error("Erro ao carregar pagamento: " + (e as Error).message);
      }
    })();
    if (mpInitialized) setPkReady(true);
  }, [step, getPk]);

  const reset = () => {
    setStep("dados");
    setNome(""); setTelefone(""); setEmail(""); setRua(""); setNumero(""); setBairro(""); setCidade(""); setEstado(""); setCep(""); setObs("");
    setOpcoesFrete([]); setFreteSel(null); setPedido(null); setPixData(null);
  };
  const handleClose = (v: boolean) => {
    if (!v && step === "sucesso") { clear(); reset(); }
    onOpenChange(v);
  };

  async function submitDados(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return toast.error("Informe seu nome");
    if (telefone.replace(/\D/g, "").length < 10) return toast.error("Telefone inválido");
    if (cep.replace(/\D/g, "").length !== 8) return toast.error("CEP inválido (8 dígitos)");
    if (!rua.trim() || !numero.trim() || !bairro.trim() || !cidade.trim() || !estado.trim()) {
      return toast.error("Preencha rua, número, bairro, cidade e estado");
    }
    setLoadingFrete(true);
    try {
      const ops = await calcFrete({
        data: {
          cep_destino: cep,
          subtotal,
          itens: items.map((it) => ({ id: it.id, quantidade: it.quantidade })),
        },
      });
      if (!ops.length) throw new Error("Nenhuma opção de frete disponível para este CEP");
      setOpcoesFrete(ops);
      setFreteSel(ops[0]);
      setStep("frete");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoadingFrete(false);
    }
  }

  async function confirmarFrete() {
    if (!freteSel) return;
    setProcessing(true);
    try {
      const p = await criarPedido({
        data: {
          cliente: {
            nome: nome.trim(),
            telefone: telefone.trim(),
            email: email.trim() || undefined,
            endereco: `${rua.trim()}, nº ${numero.trim()} - ${bairro.trim()}`,
            cidade: `${cidade.trim()}/${estado.trim().toUpperCase()}`,
            cep: cep.trim(),
            observacoes: obs.trim() || undefined,
          },
          itens: items.map((it) => ({ id: it.id, nome: it.nome, preco: it.preco, quantidade: it.quantidade })),
          subtotal,
          frete: { valor: freteSel.preco, servico: `${freteSel.empresa} ${freteSel.nome}`, prazo_dias: freteSel.prazo_dias },
          total,
        },
      });
      setPedido({ id: p.pedido_id, numero: p.numero });
      setStep("pagamento");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setProcessing(false);
    }
  }

  async function onPaymentSubmit({ formData, selectedPaymentMethod }: any) {
    if (!pedido) return;
    setProcessing(true);
    try {
      const metodo: "card" | "pix" | "bolbradesco" =
        selectedPaymentMethod === "credit_card" || selectedPaymentMethod === "debit_card"
          ? "card"
          : selectedPaymentMethod === "bank_transfer"
          ? "pix"
          : selectedPaymentMethod === "ticket"
          ? "bolbradesco"
          : "card";

      const res = await pagar({
        data: {
          pedido_id: pedido.id,
          transaction_amount: total,
          description: `Pedido ${pedido.numero}`,
          payer: {
            email: formData?.payer?.email || email || "cliente@sem-email.com",
            identification: formData?.payer?.identification,
          },
          token: formData?.token,
          payment_method_id: formData?.payment_method_id,
          installments: formData?.installments,
          issuer_id: formData?.issuer_id,
          metodo,
          origin: window.location.origin,
        },
      });

      if (res.status === "approved") {
        setStep("sucesso");
      } else if (res.pix) {
        setPixData(res.pix);
        toast.info("Escaneie o QR Code para pagar via PIX");
      } else if (res.status === "in_process" || res.status === "pending") {
        toast.info("Pagamento em análise. Você será avisado assim que aprovado.");
        setStep("sucesso");
      } else {
        toast.error(`Pagamento recusado: ${res.status_detail || res.status}`);
      }
    } catch (err) {
      toast.error("Erro no pagamento: " + (err as Error).message);
    } finally {
      setProcessing(false);
    }
  }

  const paymentInitialization = useMemo(
    () => ({
      amount: Number.isFinite(total) && total > 0 ? Number(total.toFixed(2)) : 0.01,
      payer: {
        email: (email || "").trim() || undefined,
        firstName: nome.trim().split(" ")[0] || undefined,
        lastName: nome.trim().split(" ").slice(1).join(" ") || undefined,
        entityType: "individual" as const,
      },
    }),
    [total, email, nome]
  );


  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
        {step === "sucesso" ? (
          <div className="py-6 text-center space-y-4">
            <div className="mx-auto w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <DialogHeader>
              <DialogTitle className="text-center">Pedido confirmado! 🎉</DialogTitle>
              <DialogDescription className="text-center">
                Pedido <strong>{pedido?.numero}</strong> registrado. Você receberá o comprovante e detalhes no WhatsApp em instantes.
              </DialogDescription>
            </DialogHeader>
            <Button className="w-full" onClick={() => handleClose(false)}>Fechar</Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>
                {step === "dados" && "1. Dados e entrega"}
                {step === "frete" && "2. Escolha o frete"}
                {step === "pagamento" && "3. Pagamento"}
              </DialogTitle>
              <DialogDescription>
                {step === "dados" && "Preencha seus dados para calcular o frete."}
                {step === "frete" && "Selecione a opção de envio."}
                {step === "pagamento" && `Pedido ${pedido?.numero} — pague com cartão, PIX ou boleto.`}
              </DialogDescription>
            </DialogHeader>

            {step === "dados" && (
              <form onSubmit={submitDados} className="space-y-3">
                <div className="space-y-1">
                  <Label>Nome completo *</Label>
                  <Input value={nome} onChange={(e) => setNome(e.target.value)} required />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>WhatsApp *</Label>
                    <Input placeholder="5511999999999" maxLength={15} value={telefone} onChange={(e) => setTelefone(e.target.value)} required />
                  </div>
                  <div className="space-y-1">
                    <Label>E-mail *</Label>
                    <Input type="email" maxLength={255} value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Rua *</Label>
                  <Input placeholder="Nome da rua" maxLength={120} value={rua} onChange={(e) => setRua(e.target.value)} required />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Número *</Label>
                    <Input placeholder="Ex: 11" maxLength={20} value={numero} onChange={(e) => setNumero(e.target.value)} required />
                  </div>
                  <div className="space-y-1">
                    <Label>Bairro *</Label>
                    <Input placeholder="Seu bairro" maxLength={80} value={bairro} onChange={(e) => setBairro(e.target.value)} required />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Cidade *</Label>
                    <Input maxLength={80} value={cidade} onChange={(e) => setCidade(e.target.value)} required />
                  </div>
                  <div className="space-y-1">
                    <Label>Estado *</Label>
                    <Input placeholder="SP" maxLength={2} value={estado} onChange={(e) => setEstado(e.target.value.replace(/[^a-zA-Z]/g, "").toUpperCase())} required />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>CEP *</Label>
                    <Input placeholder="00000-000" maxLength={9} value={cep} onChange={(e) => setCep(e.target.value)} required />
                  </div>
                  <div className="space-y-1">
                    <Label>Complemento</Label>
                    <Input placeholder="Apto, bloco, referência" maxLength={200} value={obs} onChange={(e) => setObs(e.target.value)} />
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-lg border bg-muted/40 p-3">
                  <span className="text-sm text-muted-foreground">Subtotal</span>
                  <span className="text-lg font-bold">{formatBRL(subtotal)}</span>
                </div>
                <Button type="submit" size="lg" className="w-full bg-header text-white hover:bg-header/90" disabled={loadingFrete}>
                  {loadingFrete ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Truck className="mr-2 h-4 w-4" />}
                  Calcular frete
                </Button>
              </form>
            )}

            {step === "frete" && (
              <div className="space-y-3">
                <div className="space-y-2">
                  {opcoesFrete.map((op) => (
                    <label
                      key={op.id}
                      className={`flex items-center justify-between rounded-lg border p-3 cursor-pointer transition ${
                        freteSel?.id === op.id ? "border-header bg-header/5" : "hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="frete"
                          checked={freteSel?.id === op.id}
                          onChange={() => setFreteSel(op)}
                          className="accent-header"
                        />
                        <div>
                          <div className="font-medium">{op.empresa} {op.nome}</div>
                          <div className="text-xs text-muted-foreground">Prazo: {op.prazo_dias} dias úteis</div>
                        </div>
                      </div>
                      <div className="font-bold text-header">{op.preco === 0 ? "Grátis" : formatBRL(op.preco)}</div>
                    </label>
                  ))}
                </div>

                <div className="rounded-lg border bg-muted/40 p-3 text-sm space-y-1">
                  <div className="flex justify-between"><span>Subtotal</span><span>{formatBRL(subtotal)}</span></div>
                  <div className="flex justify-between"><span>Frete</span><span>{formatBRL(freteSel?.preco ?? 0)}</span></div>
                  <div className="flex justify-between font-bold text-base pt-1 border-t"><span>Total</span><span>{formatBRL(total)}</span></div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep("dados")} disabled={processing}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
                  </Button>
                  <Button className="flex-1 bg-header text-white hover:bg-header/90" onClick={confirmarFrete} disabled={!freteSel || processing}>
                    {processing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                    Confirmar e ir ao pagamento
                  </Button>
                </div>
              </div>
            )}

            {step === "pagamento" && (
              <div className="space-y-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => handleClose(false)}
                  disabled={processing}
                >
                  Fechar / Cancelar
                </Button>

                {pixData ? (
                  <div className="space-y-3 text-center">
                    <img
                      src={`data:image/png;base64,${pixData.qr_code_base64}`}
                      alt="QR Code PIX"
                      className="mx-auto w-56 h-56 border rounded"
                    />
                    <div className="text-xs text-muted-foreground">Após o pagamento, você receberá a confirmação por WhatsApp.</div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          navigator.clipboard.writeText(pixData.qr_code);
                          toast.success("Código PIX copiado!");
                        }}
                      >
                        <Copy className="mr-2 h-4 w-4" /> Copiar código PIX
                      </Button>
                      <Button asChild variant="outline">
                        <a href={pixData.ticket_url} target="_blank" rel="noreferrer">
                          <FileText className="mr-2 h-4 w-4" /> Abrir
                        </a>
                      </Button>
                    </div>
                    <Button className="w-full bg-header text-white hover:bg-header/90" onClick={() => setStep("sucesso")}>
                      Já paguei, finalizar
                    </Button>
                  </div>
                ) : pkReady ? (
                  <>
                    <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                      <div className="flex justify-between font-bold"><span>Total</span><span>{formatBRL(total)}</span></div>
                    </div>
                    <Payment
                      key={`mp-brick-${pedido?.numero ?? "novo"}`}
                      initialization={paymentInitialization}
                      customization={{
                        paymentMethods: {
                          creditCard: "all",
                          debitCard: "all",
                          bankTransfer: ["pix"],
                          ticket: "all",
                          maxInstallments: 12,
                        },
                        visual: { style: { theme: "default" } },
                      }}
                      onSubmit={onPaymentSubmit}
                      onError={(err: any) => toast.error("Erro: " + (err?.message || "pagamento"))}
                    />
                    <Button variant="ghost" size="sm" onClick={() => setStep("frete")} disabled={processing}>
                      <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
                    </Button>
                  </>
                ) : (
                  <div className="py-8 text-center text-muted-foreground">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin mb-2" />
                    Carregando pagamento…
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
