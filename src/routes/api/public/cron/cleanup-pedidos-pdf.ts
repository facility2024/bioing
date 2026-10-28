import { createFileRoute } from "@tanstack/react-router";

const BUCKET = "pedidos-pdf";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

async function handle(request: Request) {
  const expectedSecret = process.env.CLEANUP_CRON_SECRET;
  if (!expectedSecret) {
    return Response.json({ ok: false, error: "Cron secret is not configured" }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${expectedSecret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: files, error } = await supabaseAdmin.storage.from(BUCKET).list("", {
    limit: 1000,
    sortBy: { column: "created_at", order: "asc" },
  });

  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }

  const cutoff = Date.now() - MAX_AGE_MS;
  const expiredFiles = (files ?? [])
    .filter((file) => file.created_at && new Date(file.created_at).getTime() < cutoff)
    .map((file) => file.name);

  if (expiredFiles.length === 0) {
    return Response.json({ ok: true, deleted: 0 });
  }

  const { error: deleteError } = await supabaseAdmin.storage.from(BUCKET).remove(expiredFiles);
  if (deleteError) {
    return Response.json({ ok: false, error: deleteError.message }, { status: 500 });
  }

  return Response.json({ ok: true, deleted: expiredFiles.length });
}

export const Route = createFileRoute("/api/public/cron/cleanup-pedidos-pdf")({
  server: {
    handlers: {
      GET: async ({ request }) => handle(request),
      POST: async ({ request }) => handle(request),
    },
  },
});
