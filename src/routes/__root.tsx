import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, lazy, Suspense, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { ThemeApplier, useConfigLoja } from "@/hooks/use-config-loja";

const OfferPopup = lazy(() =>
  import("@/components/offer-popup").then((m) => ({ default: m.OfferPopup })),
);
const InstallAppPrompt = lazy(() =>
  import("@/components/install-app-prompt").then((m) => ({ default: m.InstallAppPrompt })),
);


function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Página não encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          A página que você procura não existe ou foi movida.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Esta página não carregou
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Algo deu errado. Tente atualizar ou voltar ao início.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Tentar novamente
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Início
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "theme-color", content: "#4CAF50" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: "BioIng" },
      { title: "Loja — BioIng" },
      { name: "description", content: "Essência Aroma Em Pó Sabor Queijo Parmesão Intenso" },
      { property: "og:title", content: "Loja — BioIng" },
      { property: "og:description", content: "Essência Aroma Em Pó Sabor Queijo Parmesão Intenso" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Loja — BioIng" },
      { name: "twitter:description", content: "Essência Aroma Em Pó Sabor Queijo Parmesão Intenso" },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/35v28ZllsCSrTms5aieVCIKMilX2/social-images/social-1784134571639-WhatsApp_Image_2026-07-15_at_13.55.30.webp" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/35v28ZllsCSrTms5aieVCIKMilX2/social-images/social-1784134571639-WhatsApp_Image_2026-07-15_at_13.55.30.webp" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => sub.subscription.unsubscribe();
  }, [router, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeApplier />
      <div className="min-h-screen flex flex-col">
        <div className="flex-1">
          <Outlet />
        </div>
        <SiteFooter />
      </div>
      <Suspense fallback={null}>
        <OfferPopup />
      </Suspense>

      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  );
}

function SiteFooter() {
  const { data } = useConfigLoja();
  const linhas = [
    data?.rodape_texto,
    data?.rodape_cnpj ? `CNPJ: ${data.rodape_cnpj}` : null,
    data?.rodape_endereco,
    [data?.rodape_telefone, data?.rodape_email].filter(Boolean).join(" · ") || null,
  ].filter(Boolean);

  return (
    <footer className="bg-header text-white mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-6 text-center text-sm space-y-1">
        {linhas.length > 0 ? (
          linhas.map((l, i) => <p key={i} className={i === 0 ? "font-semibold" : "opacity-90"}>{l}</p>)
        ) : (
          <p>© {new Date().getFullYear()} — Todos os direitos reservados.</p>
        )}
        {linhas.length > 0 && (
          <p className="opacity-70 pt-2">© {new Date().getFullYear()} — Todos os direitos reservados.</p>
        )}
      </div>
    </footer>
  );
}

