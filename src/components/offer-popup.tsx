import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { X } from "lucide-react";
import { useConfigLoja } from "@/hooks/use-config-loja";

type Oferta = {
  id: string;
  ativo: boolean;
  titulo: string | null;
  descricao: string | null;
  imagem_url: string | null;
  cta_texto: string | null;
  cta_url: string | null;
  mostrar_logo: boolean;
  auto_fechar_segundos: number;
  fechar_manualmente: boolean;
};

const SESSION_KEY = "oferta-popup-visto";

export function OfferPopup() {
  const [open, setOpen] = useState(false);
  const { data: config } = useConfigLoja();

  const { data: oferta } = useQuery({
    queryKey: ["oferta-popup"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("oferta_popup")
        .select("id, ativo, titulo, descricao, imagem_url, cta_texto, cta_url, mostrar_logo, auto_fechar_segundos, fechar_manualmente")
        .eq("ativo", true)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as Oferta | null;
    },
  });

  useEffect(() => {
    if (!oferta) return;
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(SESSION_KEY) === oferta.id) return;
    setOpen(true);
    sessionStorage.setItem(SESSION_KEY, oferta.id);
    const secs = Number(oferta.auto_fechar_segundos) || 0;
    if (secs > 0) {
      const t = setTimeout(() => setOpen(false), secs * 1000);
      return () => clearTimeout(t);
    }
  }, [oferta]);

  if (!oferta || !open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="relative w-full max-w-md rounded-2xl bg-card shadow-2xl overflow-hidden animate-scale-in">
        {oferta.fechar_manualmente && (
          <button
            onClick={() => setOpen(false)}
            aria-label="Fechar"
            className="absolute top-3 right-3 z-10 h-8 w-8 rounded-full bg-black/50 text-white grid place-items-center hover:bg-black/70 transition"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {oferta.mostrar_logo && config?.logo_url && (
          <div className="flex justify-center pt-5 pb-2 bg-card">
            <img src={config.logo_url} alt={config.nome_empresa ?? "Logo"} className="h-14 w-14 object-contain rounded-md bg-white p-1" />
          </div>
        )}

        {oferta.imagem_url && (
          <img src={oferta.imagem_url} alt={oferta.titulo ?? "Oferta"} className="w-full h-56 object-cover" />
        )}

        <div className="p-6 text-center space-y-3">
          {oferta.titulo && <h3 className="text-2xl font-bold">{oferta.titulo}</h3>}
          {oferta.descricao && <p className="text-sm text-muted-foreground whitespace-pre-line">{oferta.descricao}</p>}
          {oferta.cta_url && (
            <a
              href={oferta.cta_url}
              target={oferta.cta_url.startsWith("http") ? "_blank" : undefined}
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground px-6 py-3 font-semibold hover:opacity-90 transition"
              onClick={(e) => {
                // navegação interna: dispara um popstate para o app abrir o produto sem recarregar
                if (!oferta.cta_url!.startsWith("http")) {
                  e.preventDefault();
                  setOpen(false);
                  window.history.pushState({}, "", oferta.cta_url!);
                  window.dispatchEvent(new PopStateEvent("popstate"));
                } else {
                  setOpen(false);
                }
              }}
            >
              {oferta.cta_texto || "Aproveitar"}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
