import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useConfigLoja } from "@/hooks/use-config-loja";
import logoAsset from "@/assets/ingredientes-bio-logo.png.asset.json";

type Msg = { from: "bot" | "user"; text: string; button?: { label: string; href: string } };
type Step = "greeting" | "ask_name" | "ask_whatsapp" | "ask_question" | "finishing" | "closed";

const AVATAR = logoAsset.url;

function onlyDigits(s: string) {
  return (s || "").replace(/\D/g, "");
}

export function ChatWidget() {
  const { data: cfg } = useConfigLoja();
  const [open, setOpen] = useState(false);
  const [showTeaser, setShowTeaser] = useState(false);
  const [teaserDismissed, setTeaserDismissed] = useState(false);
  const [step, setStep] = useState<Step>("greeting");
  const [msgs, setMsgs] = useState<Msg[]>([
    { from: "bot", text: "Olá! 👋 Posso te ajudar em algo? Tire suas dúvidas por aqui." },
  ]);
  const [input, setInput] = useState("");
  const [nome, setNome] = useState("");
  const [whats, setWhats] = useState("");
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Envia mensagens do bot de forma "humanizada": mostra "digitando..." e
  // aguarda um tempo proporcional ao tamanho do texto antes de exibir.
  const sendBot = (text: string, button?: Msg["button"], baseDelay = 500) => {
    setTyping(true);
    const readingDelay = Math.min(2400, Math.max(700, text.length * 28));
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        setMsgs((m) => [...m, { from: "bot", text, button }]);
        setTyping(false);
        resolve();
      }, baseDelay + readingDelay);
    });
  };

  // Sobe teaser depois de 8s
  useEffect(() => {
    if (open || teaserDismissed) return;
    const t = setTimeout(() => setShowTeaser(true), 8000);
    return () => clearTimeout(t);
  }, [open, teaserDismissed]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, open, typing]);

  const openChat = () => {
    setOpen(true);
    setShowTeaser(false);
    setTeaserDismissed(true);
  };

  const numeroWhatsAtendimento = onlyDigits(cfg?.rodape_telefone || "");
  const linkWhats = numeroWhatsAtendimento
    ? `https://wa.me/${numeroWhatsAtendimento.length === 10 || numeroWhatsAtendimento.length === 11 ? "55" + numeroWhatsAtendimento : numeroWhatsAtendimento}`
    : "https://wa.me/";

  const addUser = (text: string) => setMsgs((m) => [...m, { from: "user", text }]);

  const handleSend = async () => {
    if (step === "closed" || typing) return;
    const val = input.trim();
    if (!val) return;
    addUser(val);
    setInput("");

    if (step === "greeting") {
      setStep("ask_name");
      await sendBot("Que bom! Fico feliz em ajudar 😊");
      await sendBot("Antes da gente começar, como posso te chamar? Me conta seu nome, por favor.", undefined, 300);
      return;
    }

    if (step === "ask_name") {
      setNome(val);
      const primeiro = val.split(" ")[0];
      setStep("ask_whatsapp");
      await sendBot(`Prazer em te conhecer, ${primeiro}! 🤝`);
      await sendBot("Agora me passa o seu WhatsApp com DDD, tá? (ex: 11 99999-9999)", undefined, 300);
      return;
    }

    if (step === "ask_whatsapp") {
      const dig = onlyDigits(val);
      if (dig.length < 10) {
        await sendBot("Hmm, acho que faltou algum número aí 🤔");
        await sendBot("Pode me enviar de novo com o DDD? Assim consigo te ajudar direitinho.", undefined, 200);
        return;
      }
      setWhats(dig);
      setStep("ask_question");
      await sendBot("Perfeito, anotei aqui ✅");
      await sendBot("Agora me conta: qual é a sua dúvida?", undefined, 300);
      return;
    }

    if (step === "ask_question") {
      setStep("finishing");
      const nomePrimeiro = nome.split(" ")[0] || "";
      const msgWhats = encodeURIComponent(
        `Olá! Meu nome é ${nome}. Tenho uma dúvida: ${val}`,
      );
      const href = `${linkWhats}?text=${msgWhats}`;
      await sendBot(`Entendi${nomePrimeiro ? `, ${nomePrimeiro}` : ""}! Obrigado por compartilhar 🙌`);
      await sendBot(
        "Vou te encaminhar agora para um dos nossos atendentes. É só clicar no botão aqui embaixo que a conversa continua no WhatsApp 👇",
        { label: "Falar no WhatsApp", href },
        400,
      );
      await sendBot("💬 Conversa encerrada por aqui. Foi um prazer! Te vejo no WhatsApp 👋", undefined, 600);
      setStep("closed");
      return;
    }
  };

  return (
    <>
      {/* Teaser bubble */}
      {!open && showTeaser && (
        <div className="fixed bottom-24 right-4 z-40 max-w-[260px] animate-in fade-in slide-in-from-bottom-2">
          <button
            onClick={openChat}
            className="relative flex items-start gap-2 rounded-2xl rounded-br-sm bg-white shadow-xl border border-gray-200 px-3 py-2.5 text-left hover:shadow-2xl transition-shadow"
          >
            <img src={AVATAR} alt="Ingredientes Bio" className="h-8 w-8 rounded-full object-cover shrink-0 border border-black/70" />
            <div className="text-sm text-gray-800 leading-snug">
              <p className="font-semibold text-header">Ingredientes Bio</p>
              <p>Olá! 👋 Posso te ajudar em algo? Tire suas dúvidas!</p>
            </div>
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                setShowTeaser(false);
                setTeaserDismissed(true);
              }}
              className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-gray-700 text-white text-[10px] flex items-center justify-center hover:bg-gray-900"
            >
              ×
            </span>
          </button>
        </div>
      )}

      {/* FAB */}
      {!open && (
        <button
          onClick={openChat}
          aria-label="Abrir chat"
          className="fixed bottom-4 right-4 z-40 h-14 w-14 rounded-full bg-header shadow-lg hover:scale-105 transition-transform flex items-center justify-center overflow-hidden border border-black/80"
        >
          <img src={AVATAR} alt="Ingredientes Bio" className="h-14 w-14 object-cover" />
          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-emerald-500 ring-2 ring-white animate-pulse" />
        </button>
      )}

      {/* Chat window */}
      {open && (
        <div className="fixed bottom-4 right-4 z-40 w-[92vw] max-w-sm h-[70vh] max-h-[560px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4">
          {/* Header */}
          <div className="bg-header text-white px-4 py-3 flex items-center gap-3">
            <img src={AVATAR} alt="" className="h-10 w-10 rounded-full object-cover bg-white/10 border border-black/70" />
            <div className="flex-1 leading-tight">
              <p className="font-semibold">Ingredientes Bio</p>
              <p className="text-xs opacity-90 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400 inline-block" />
                Atendimento online
              </p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1 rounded hover:bg-white/10"
              aria-label="Fechar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 bg-[#f5f7f5]">
            {msgs.map((m, i) => (
              <div key={i} className={`flex gap-2 ${m.from === "user" ? "justify-end" : "justify-start"}`}>
                {m.from === "bot" && (
                  <img src={AVATAR} alt="" className="h-8 w-8 rounded-full object-cover shrink-0 border border-black/70" />
                )}
                <div className="max-w-[75%] space-y-2">
                  <div
                    className={`px-3 py-2 rounded-2xl text-sm leading-snug whitespace-pre-wrap ${
                      m.from === "user"
                        ? "bg-header text-white rounded-br-sm"
                        : "bg-white text-gray-800 border border-gray-200 rounded-bl-sm"
                    }`}
                  >
                    {m.text}
                  </div>
                  {m.button && (
                    <a
                      href={m.button.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium px-4 py-2 rounded-full shadow-sm transition-colors"
                    >
                      <MessageCircle className="h-4 w-4" />
                      {m.button.label}
                    </a>
                  )}
                </div>
              </div>
            ))}

            {typing && (
              <div className="flex gap-2 justify-start">
                <img src={AVATAR} alt="" className="h-8 w-8 rounded-full object-cover shrink-0 border border-black/70" />
                <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-3 py-2.5 flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.3s]" />
                  <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.15s]" />
                  <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce" />
                </div>
              </div>
            )}
          </div>

          {/* Composer */}
          <div className="border-t bg-white p-2 flex items-center gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSend();
                }
              }}
              disabled={step === "closed" || step === "finishing" || typing}
              placeholder={
                typing
                  ? "Aguarde, está digitando..."
                  : step === "closed"
                    ? "Chat encerrado"
                    : step === "ask_name"
                      ? "Seu nome..."
                      : step === "ask_whatsapp"
                        ? "Ex: 11 99999-9999"
                        : step === "ask_question"
                          ? "Descreva sua dúvida..."
                          : "Digite sua mensagem..."
              }
              className="flex-1 h-10"
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={step === "closed" || step === "finishing" || typing || !input.trim()}
              className="bg-header hover:bg-header/90 text-white h-10 w-10"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
