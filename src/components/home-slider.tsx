import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Slide = { id: string; imagem_url: string; link_url: string | null; intervalo_segundos: number | null };

export function HomeSlider() {
  const { data: slides } = useQuery({
    queryKey: ["home-slides"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("home_slides")
        .select("id, imagem_url, link_url, intervalo_segundos, ordem")
        .eq("ativo", true)
        .order("ordem", { ascending: true });
      if (error) throw error;
      const rows = (data ?? []) as (Slide & { ordem: number })[];
      // Garante ordem correta no cliente (mobile pode receber cache antigo)
      return [...rows].sort((a, b) => a.ordem - b.ordem) as Slide[];
    },
    staleTime: 0,
    refetchOnMount: "always",
  });

  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (!slides || slides.length <= 1) return;
    const secs = Math.max(1, Number(slides[idx]?.intervalo_segundos) || 5);
    const t = setTimeout(() => setIdx((i) => (i + 1) % slides.length), secs * 1000);
    return () => clearTimeout(t);
  }, [slides, idx]);

  if (!slides || slides.length === 0) return null;

  return (
    <div
      className="w-full relative bg-muted overflow-hidden shadow-2xl ring-1 ring-black/5 aspect-[1600/552]"
      style={{ boxShadow: "0 25px 50px -12px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.05)" }}
    >
      {slides.map((s, i) => {
        const img = (
          <img
            src={s.imagem_url}
            alt="Banner promocional"
            className="w-full h-full object-cover"
            loading={i === 0 ? "eager" : "lazy"}
            decoding="async"
          />
        );
        return (
          <div
            key={s.id}
            className={`absolute inset-0 transition-opacity duration-500 ${
              i === idx ? "opacity-100 z-10" : "opacity-0 z-0"
            }`}
            aria-hidden={i !== idx}
          >
            {s.link_url ? (
              <a href={s.link_url} target="_blank" rel="noreferrer" className="block h-full w-full">
                {img}
              </a>
            ) : (
              img
            )}
          </div>
        );
      })}
      {slides.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 z-20">
          {slides.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setIdx(i)}
              aria-label={`Slide ${i + 1}`}
              className={`h-2 rounded-full transition-all ${
                i === idx ? "w-6 bg-white" : "w-2 bg-white/60"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
