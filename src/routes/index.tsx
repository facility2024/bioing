import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Package } from "lucide-react";
import { CartProvider, useCart, formatBRL } from "@/hooks/use-cart";
import { CartDrawer } from "@/components/cart-drawer";
import { toast } from "sonner";

const LOGO_URL = "https://http2.mlstatic.com/D_NQ_NP_647118-MLA112443697393_052026-F.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Loja — Produtos" },
      { name: "description", content: "Confira nossos produtos e faça seu pedido." },
      { property: "og:title", content: "Nossa Loja" },
      { property: "og:description", content: "Produtos selecionados com entrega rápida." },
    ],
  }),
  component: () => (
    <CartProvider>
      <Storefront />
    </CartProvider>
  ),
});

type Produto = {
  id: string;
  nome: string;
  descricao: string | null;
  preco: number;
  imagem_url: string | null;
  estoque: number | null;
  controla_estoque: boolean;
};

function Storefront() {
  const { data: produtos, isLoading, error } = useQuery({
    queryKey: ["produtos-loja"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("produtos")
        .select("id, nome, descricao, preco, imagem_url, estoque, controla_estoque")
        .eq("ativo", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Produto[];
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col items-center gap-3 relative">
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <CartDrawer />
          </div>
          <img
            src={LOGO_URL}
            alt="Logo"
            width={120}
            height={120}
            className="h-[120px] w-[120px] object-contain rounded-md"
          />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {isLoading && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-xl border bg-card animate-pulse">
                <div className="aspect-square bg-muted rounded-t-xl" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-full" />
                  <div className="h-5 bg-muted rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="text-center py-16 text-destructive">
            Erro ao carregar produtos.
          </div>
        )}

        {!isLoading && !error && produtos && produtos.length === 0 && (
          <div className="text-center py-20">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold">Nenhum produto disponível</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Cadastre produtos no painel administrativo para começar a vender.
            </p>
          </div>
        )}

        {produtos && produtos.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {produtos.map((p) => (
              <ProductCard key={p.id} produto={p} />
            ))}
          </div>
        )}
      </main>

      <footer className="border-t mt-16 py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} — Todos os direitos reservados.
      </footer>
    </div>
  );
}

function ProductCard({ produto }: { produto: Produto }) {
  const { add } = useCart();
  const semEstoque = produto.controla_estoque && (produto.estoque ?? 0) <= 0;

  const handleAdd = () => {
    add({
      id: produto.id,
      nome: produto.nome,
      preco: Number(produto.preco),
      imagem_url: produto.imagem_url,
    });
    toast.success(`${produto.nome} adicionado ao carrinho`);
  };

  return (
    <div className="group rounded-xl border bg-card overflow-hidden flex flex-col hover:shadow-lg transition-shadow">
      <div className="aspect-square bg-muted overflow-hidden">
        {produto.imagem_url ? (
          <img
            src={produto.imagem_url}
            alt={produto.nome}
            loading="lazy"
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-muted-foreground">
            <ShoppingBag className="h-10 w-10" />
          </div>
        )}
      </div>
      <div className="p-4 flex flex-col flex-1 gap-2">
        <h3 className="font-semibold text-sm md:text-base line-clamp-2">{produto.nome}</h3>
        {produto.descricao && (
          <p className="text-xs text-muted-foreground line-clamp-2">{produto.descricao}</p>
        )}
        <p className="text-lg font-bold text-primary mt-auto">{formatBRL(Number(produto.preco))}</p>
        <Button onClick={handleAdd} disabled={semEstoque} className="w-full" size="sm">
          {semEstoque ? "Esgotado" : "Adicionar"}
        </Button>
      </div>
    </div>
  );
}
