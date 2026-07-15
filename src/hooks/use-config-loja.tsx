import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

export type ConfigLoja = {
  id: string;
  nome_empresa: string | null;
  logo_url: string | null;
  cor_primaria: string | null;
  cor_botoes: string | null;
  cor_header: string | null;
  cor_background: string | null;
  cor_texto_botoes: string | null;
  rodape_texto: string | null;
  rodape_cnpj: string | null;
  rodape_endereco: string | null;
  rodape_email: string | null;
  rodape_telefone: string | null;
};

export function useConfigLoja() {
  return useQuery({
    queryKey: ["config-loja"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("configuracoes_empresa")
        .select(
          "id, nome_empresa, logo_url, cor_primaria, cor_botoes, cor_header, cor_background, cor_texto_botoes, rodape_texto, rodape_cnpj, rodape_endereco, rodape_email, rodape_telefone",
        )
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as ConfigLoja | null;
    },
    staleTime: 60_000,
  });
}

export function ThemeApplier() {
  const { data } = useConfigLoja();
  useEffect(() => {
    if (!data) return;
    const root = document.documentElement;
    if (data.cor_primaria) root.style.setProperty("--primary", data.cor_primaria);
    if (data.cor_botoes) root.style.setProperty("--primary", data.cor_botoes);
    if (data.cor_texto_botoes) root.style.setProperty("--primary-foreground", data.cor_texto_botoes);
    if (data.cor_header) root.style.setProperty("--header", data.cor_header);
    if (data.cor_background) root.style.setProperty("--background", data.cor_background);
  }, [data]);
  return null;
}
