import { createFileRoute } from "@tanstack/react-router";

const BUCKET = "pedidos-pdf";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

async function handle() {
  const anon = process.env.SUPABASE_PUBLISHABLE_KEY;
  const apiKey = (globalThis as any).__cronApiKey as string | undefined;
  // We accept the anon key via the `apikey` header (verified below).
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: files, error } = await supabaseAdmin.storage.from(BUCKET).list("", {
    limit: 1000,
    sortBy: { column: "created_at", order: "asc" },
  });
  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  const cutoff = Date.now() - MAX_AGE_MS;
  const toDelete = (files || [])
    .filter((f) => {
      const created = f.created_at ? new Date(f.created_at).getTime() : Date.now();
      return created < cutoff;
    })
    .map((f) => f.name);

  if (toDelete.length === 0) {
    return new Response(JSON.stringify({ ok: true, deleted: 0 }), {
      headers: { "content-type": "application/json" },
    });
  }

  const { error: delErr } = await supabaseAdmin.storage.from(BUCKET).remove(toDelete);
  if (delErr) {
    return new Response(JSON.stringify({ ok: false, error: delErr.message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
  return new Response(JSON.stringify({ ok: true, deleted: toDelete.length }), {
    headers: { "content-type": "application/json" },
  });
}

export const Route = createFileRoute("/api/public/cron/cleanup-pedidos-pdf")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const apikey = request.headers.get("apikey") || request.headers.get("x-api-key");
        if (!apikey || apikey !== process.env.SUPABASE_PUBLISHABLE_KEY) {
          return new Response("Unauthorized", { status: 401 });
        }
        return handle();
      },
      POST: async ({ request }) => {
        const apikey = request.headers.get("apikey") || request.headers.get("x-api-key");
        if (!apikey || apikey !== process.env.SUPABASE_PUBLISHABLE_KEY) {
          return new Response("Unauthorized", { status: 401 });
        }
        return handle();
      },
    },
  },
});
