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
        .select("id, imagem_url, link_url, intervalo_segundos")
        .eq("ativo", true)
        .order("ordem", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Slide[];
    },
  });

  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (!slides || slides.length <= 1) return;
    const secs = Math.max(1, Number(slides[idx]?.intervalo_segundos) || 5);
    const t = setTimeout(() => setIdx((i) => (i + 1) % slides.length), secs * 1000);
    return () => clearTimeout(t);
  }, [slides, idx]);

  if (!slides || slides.length === 0) return null;

  const current = slides[idx];

  const img = (
    <img
      src={current.imagem_url}
      alt="Banner promocional"
      className="w-full h-[250px] object-cover"
      loading="eager"
    />
  );

  return (
    <div
      className="w-full relative bg-muted overflow-hidden rounded-xl shadow-2xl ring-1 ring-black/5 transition-transform duration-500 hover:scale-[1.02] hover:-translate-y-1 max-w-6xl mx-auto -mt-6 md:-mt-8"
      style={{ height: 250, boxShadow: "0 25px 50px -12px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.05)" }}
    >
      {current.link_url ? (
        <a href={current.link_url} target="_blank" rel="noreferrer">{img}</a>
      ) : (
        img
      )}
      {slides.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
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
