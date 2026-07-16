import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const WAPI_BASE = "https://api.w-api.app/v1";

function onlyDigits(s: string) {
  return (s || "").replace(/\D/g, "");
}

/**
 * Verifica produtos com estoque <=3 ainda não notificados,
 * envia alerta no WhatsApp da instância e marca como notificados.
 * Retorna a quantidade notificada.
 */
export const notificarEstoqueBaixo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: baixos, error: errBaixos } = await supabaseAdmin
      .from("produtos")
      .select("id, nome, estoque")
      .eq("controla_estoque", true)
      .eq("ativo", true)
      .eq("notificado_estoque_baixo", false)
      .lte("estoque", 3);

    if (errBaixos) {
      console.error("[estoque] erro ao buscar baixos:", errBaixos);
      return { notificados: 0, motivo: errBaixos.message };
    }
    if (!baixos || baixos.length === 0) return { notificados: 0 };

    const { data: wa } = await supabaseAdmin
      .from("configuracoes_whatsapp")
      .select("instance_id, api_token, numero_conectado, ativa")
      .limit(1)
      .maybeSingle();

    if (!wa?.instance_id || !wa?.api_token || !wa?.numero_conectado || !wa?.ativa) {
      console.warn("[estoque] WhatsApp não configurado/ativo — pulando alerta.");
      return { notificados: 0, motivo: "whatsapp_nao_configurado" };
    }

    const destino = onlyDigits(wa.numero_conectado);
    console.log(
      "[estoque] enviando alerta p/ instância",
      wa.instance_id,
      "destino=",
      destino,
      "produtos=",
      baixos.length,
    );

    let ok = 0;
    const detalhes: any[] = [];
    for (const p of baixos) {
      const msg =
        `🚨 *Olá, Operador/Admin!*\n\n` +
        `📦 Passando para avisar que o estoque do produto *${p.nome}* está baixo.\n\n` +
        `⚠️ Restam apenas *${p.estoque} unidades* em estoque.\n\n` +
        `👀 Fique atento e providencie a reposição o quanto antes para evitar falta do produto.`;

      try {
        const url = `${WAPI_BASE}/message/send-text?instanceId=${encodeURIComponent(wa.instance_id)}`;
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${wa.api_token}`,
          },
          body: JSON.stringify({
            phone: destino,
            message: msg,
            delayMessage: 1,
          }),
        });
        const txt = await res.text();
        let json: any = {};
        try {
          json = JSON.parse(txt);
        } catch {}
        console.log("[estoque] W-API resposta", res.status, txt);
        detalhes.push({ produto: p.nome, status: res.status, body: json || txt });

        if (!res.ok || json?.error) {
          console.error("[estoque] W-API erro:", res.status, txt);
          continue;
        }
        await supabaseAdmin
          .from("produtos")
          .update({ notificado_estoque_baixo: true })
          .eq("id", p.id);
        ok++;
      } catch (e) {
        console.error("[estoque] falha ao enviar WhatsApp:", e);
        detalhes.push({ produto: p.nome, erro: (e as Error).message });
      }
    }
    return { notificados: ok, destino, detalhes };
  });
