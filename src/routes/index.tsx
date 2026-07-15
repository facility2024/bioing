import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Settings } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Minha Loja — Em breve" },
      { name: "description", content: "Loja virtual em construção." },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex items-center justify-center px-4">
      <div className="max-w-2xl text-center space-y-8">
        <div className="inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <ShoppingBag className="h-10 w-10" />
        </div>
        <div className="space-y-3">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Loja em construção
          </h1>
          <p className="text-lg text-muted-foreground">
            O painel administrativo já está disponível. A loja virtual será liberada em breve.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 justify-center">
          <Button asChild size="lg">
            <Link to="/admin/dashboard">
              <Settings className="mr-2 h-4 w-4" />
              Acessar Painel
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/auth">Entrar / Cadastrar</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
