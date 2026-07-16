import { useEffect, useState } from "react";
import { X, Share, Plus, MoreVertical, Smartphone, Apple } from "lucide-react";
import { useConfigLoja } from "@/hooks/use-config-loja";

const SESSION_KEY = "install-prompt-visto";

function isMobile() {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

function detectOS(): "ios" | "android" | "other" {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "other";
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // @ts-ignore
    window.navigator.standalone === true
  );
}

export function InstallAppPrompt() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"android" | "ios">("android");
  const { data: config } = useConfigLoja();

  useEffect(() => {
    const handler = () => {
      if (typeof window === "undefined") return;
      if (!isMobile()) return;
      if (isStandalone()) return;
      if (sessionStorage.getItem(SESSION_KEY)) return;
      setTab(detectOS() === "ios" ? "ios" : "android");
      setOpen(true);
      sessionStorage.setItem(SESSION_KEY, "1");
    };
    window.addEventListener("bioing:show-install-prompt", handler);
    return () => window.removeEventListener("bioing:show-install-prompt", handler);
  }, []);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[101] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4 animate-fade-in"
      onClick={() => setOpen(false)}
    >
      <div
        className="relative w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-card shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Fechar"
          className="absolute top-3 right-3 z-20 h-9 w-9 rounded-full bg-black/60 text-white grid place-items-center hover:bg-black/80 transition cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="bg-primary text-primary-foreground p-5 pb-14 text-center">
          {config?.logo_url && (
            <img
              src={config.logo_url}
              alt={config.nome_empresa ?? "Logo"}
              className="h-14 w-14 mx-auto object-contain rounded-md bg-white p-1 mb-3"
            />
          )}
          <h3 className="text-xl font-bold">Instale nosso app</h3>
          <p className="text-sm opacity-90 mt-1">
            Acesse mais rápido direto da tela inicial do seu celular.
          </p>
        </div>

        <div className="px-4 -mt-8">
          <div className="grid grid-cols-2 gap-2 bg-muted rounded-full p-1">
            <button
              onClick={() => setTab("android")}
              className={`flex items-center justify-center gap-2 rounded-full py-2 text-sm font-semibold transition ${
                tab === "android" ? "bg-white text-foreground shadow" : "text-muted-foreground"
              }`}
            >
              <Smartphone className="h-4 w-4" /> Android
            </button>
            <button
              onClick={() => setTab("ios")}
              className={`flex items-center justify-center gap-2 rounded-full py-2 text-sm font-semibold transition ${
                tab === "ios" ? "bg-white text-foreground shadow" : "text-muted-foreground"
              }`}
            >
              <Apple className="h-4 w-4" /> iPhone
            </button>
          </div>
        </div>

        <div className="p-5 pt-4">
          {tab === "android" ? (
            <ol className="space-y-3 text-sm">
              <Step n={1}>
                Abra este site no <strong>Google Chrome</strong>.
              </Step>
              <Step n={2}>
                Toque no ícone <MoreVertical className="inline h-4 w-4 align-text-bottom" /> (menu) no
                canto superior direito.
              </Step>
              <Step n={3}>
                Selecione <strong>“Instalar app”</strong> ou <strong>“Adicionar à tela inicial”</strong>.
              </Step>
              <Step n={4}>
                Confirme tocando em <strong>Instalar</strong>. Pronto! O ícone aparece na tela inicial.
              </Step>
            </ol>
          ) : (
            <ol className="space-y-3 text-sm">
              <Step n={1}>
                Abra este site no <strong>Safari</strong> (não funciona no Chrome do iPhone).
              </Step>
              <Step n={2}>
                Toque no ícone <Share className="inline h-4 w-4 align-text-bottom" /> (compartilhar)
                na barra inferior.
              </Step>
              <Step n={3}>
                Role a lista e toque em{" "}
                <strong>
                  <Plus className="inline h-4 w-4 align-text-bottom" /> Adicionar à Tela de Início
                </strong>
                .
              </Step>
              <Step n={4}>
                Toque em <strong>Adicionar</strong> no canto superior direito. Pronto!
              </Step>
            </ol>
          )}

          <button
            onClick={() => setOpen(false)}
            className="w-full mt-5 rounded-full bg-primary text-primary-foreground py-3 font-semibold hover:opacity-90 transition"
          >
            Entendi
          </button>
        </div>
      </div>
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="shrink-0 h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold grid place-items-center">
        {n}
      </span>
      <span className="pt-0.5 leading-relaxed">{children}</span>
    </li>
  );
}
