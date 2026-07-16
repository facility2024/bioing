import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, X, Volume2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { notificarEstoqueBaixo } from "@/lib/estoque.functions";

type Baixo = { id: string; nome: string; estoque: number };

const DISMISS_KEY = "estoque-baixo-dismiss-v1";

function readDismissed(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(DISMISS_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeDismissed(map: Record<string, number>) {
  try {
    localStorage.setItem(DISMISS_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

/**
 * Emite um bipe usando Web Audio (sem depender de arquivo de áudio).
 * Retorna uma função para parar.
 */
function playAlertLoop(): () => void {
  if (typeof window === "undefined") return () => {};
  const AC = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext | undefined;
  if (!AC) return () => {};
  const ctx = new AC();
  let stopped = false;
  let timer: number | null = null;

  const beep = () => {
    if (stopped) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  };

  beep();
  timer = window.setInterval(beep, 1400);

  return () => {
    stopped = true;
    if (timer !== null) window.clearInterval(timer);
    try {
      ctx.close();
    } catch {
      /* ignore */
    }
  };
}

export function EstoqueBaixoAlerta() {
  const [dismissed, setDismissed] = useState<Record<string, number>>(() => readDismissed());
  const stopAudioRef = useRef<null | (() => void)>(null);
  const notificar = useServerFn(notificarEstoqueBaixo);

  const { data: baixos } = useQuery({
    queryKey: ["admin-estoque-baixo"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("produtos")
        .select("id, nome, estoque")
        .eq("controla_estoque", true)
        .eq("ativo", true)
        .lte("estoque", 3)
        .order("estoque", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Baixo[];
    },
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  // Só alerta os produtos que o usuário ainda não dispensou nesta versão de estoque.
  // A "versão" é o próprio valor de estoque atual: se o estoque mudar, volta a alertar.
  const pendentes = (baixos ?? []).filter((p) => dismissed[p.id] !== p.estoque);

  useEffect(() => {
    if (pendentes.length > 0 && !stopAudioRef.current) {
      stopAudioRef.current = playAlertLoop();
    }
    if (pendentes.length === 0 && stopAudioRef.current) {
      stopAudioRef.current();
      stopAudioRef.current = null;
    }
    return () => {
      if (stopAudioRef.current) {
        stopAudioRef.current();
        stopAudioRef.current = null;
      }
    };
  }, [pendentes.length]);

  const dispensar = () => {
    const novo = { ...dismissed };
    for (const p of pendentes) novo[p.id] = p.estoque;
    setDismissed(novo);
    writeDismissed(novo);
    if (stopAudioRef.current) {
      stopAudioRef.current();
      stopAudioRef.current = null;
    }
  };

  if (pendentes.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[min(92vw,380px)] rounded-xl border border-destructive/40 bg-destructive text-destructive-foreground shadow-2xl animate-fade-in">
      <div className="flex items-start gap-3 p-4">
        <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/15">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold flex items-center gap-1.5">
            Estoque baixo
            <Volume2 className="h-3.5 w-3.5 opacity-80 animate-pulse" />
          </p>
          <p className="text-xs opacity-90 mt-0.5">
            {pendentes.length === 1
              ? "1 produto com poucas unidades:"
              : `${pendentes.length} produtos com poucas unidades:`}
          </p>
          <ul className="mt-2 space-y-1 max-h-40 overflow-auto text-xs">
            {pendentes.slice(0, 5).map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2">
                <span className="truncate">{p.nome}</span>
                <span className="shrink-0 rounded bg-white/15 px-1.5 py-0.5 font-semibold">
                  {p.estoque}
                </span>
              </li>
            ))}
            {pendentes.length > 5 && (
              <li className="text-[11px] opacity-80">+ {pendentes.length - 5} outros...</li>
            )}
          </ul>
          <div className="mt-3 flex items-center gap-2">
            <Link
              to="/admin/estoque"
              className="text-xs font-medium underline underline-offset-2"
            >
              Abrir estoque
            </Link>
          </div>
        </div>
        <button
          type="button"
          aria-label="Dispensar alerta"
          onClick={dispensar}
          className="shrink-0 rounded-md p-1 hover:bg-white/15 transition"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
