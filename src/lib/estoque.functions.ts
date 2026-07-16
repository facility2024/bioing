import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const WAPI_BASE = "https://api.w-api.app/v1";

function onlyDigits(s: string) {
  return (s || "").replace(/\D/g, "");
}

function whatsappPhoneCandidates(phone: string) {
  const digits = onlyDigits(phone);
  const candidates: string[] = [];

  // Alguns retornos da W-API para número brasileiro vêm sem o 9º dígito.
  // Para envio, priorizamos o formato atual do WhatsApp: 55 + DDD + 9 + número.
  if (digits.startsWith("55") && digits.length === 12) {
    candidates.push(`${digits.slice(0, 4)}9${digits.slice(4)}`);
  }

  if (digits.length >= 10) candidates.push(digits);
  return [...new Set(candidates)];
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
      .select("instance_id, api_token, numero_conectado, numero_alerta_estoque, ativa")
      .limit(1)
      .maybeSingle();

    if (!wa?.instance_id || !wa?.api_token || !wa?.ativa) {
      console.warn("[estoque] WhatsApp não configurado/ativo — pulando alerta.");
      return { notificados: 0, motivo: "whatsapp_nao_configurado" };
    }

    // Prioriza o número dedicado de alerta de estoque; se vazio, cai no número da instância.
    const numeroDestino = (wa as any).numero_alerta_estoque || wa.numero_conectado;
    if (!numeroDestino) {
      console.warn("[estoque] Nenhum número de alerta configurado.");
      return { notificados: 0, motivo: "sem_numero_alerta" };
    }

    const destinos = whatsappPhoneCandidates(numeroDestino);
    const destinoPrincipal = destinos[0] ?? onlyDigits(wa.numero_conectado);
    console.log(
      "[estoque] enviando alerta p/ instância",
      wa.instance_id,
      "destino=",
      destinoPrincipal,
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
        let enviado = false;
        for (const destino of destinos) {
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
          console.log("[estoque] W-API resposta", res.status, destino, txt);
          detalhes.push({ produto: p.nome, destino, status: res.status, body: json || txt });

          if (!res.ok || json?.error) {
            console.error("[estoque] W-API erro:", res.status, destino, txt);
            continue;
          }
          enviado = true;
          break;
        }
        if (!enviado) continue;
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
    return { notificados: ok, destino: destinoPrincipal, detalhes };
  });
