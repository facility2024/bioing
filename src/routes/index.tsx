import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Package, Truck } from "lucide-react";
import { CartProvider, useCart, formatBRL } from "@/hooks/use-cart";
import { CartDrawer } from "@/components/cart-drawer";
import { ProductDetailDialog, type ProdutoDetalhe } from "@/components/product-detail-dialog";
import { toast } from "sonner";

const LOGO_URL = "https://http2.mlstatic.com/D_NQ_NP_647118-MLA112443697393_052026-F.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Loja — BioIng" },
      { name: "description", content: "Essência Aroma Em Pó Sabor Queijo Parmesão Intenso" },
      { property: "og:title", content: "Loja — BioIng" },
      { property: "og:description", content: "Essência Aroma Em Pó Sabor Queijo Parmesão Intenso" },
    ],
  }),
  component: () => (
    <CartProvider>
      <Storefront />
    </CartProvider>
  ),
});

function Storefront() {
  const [selected, setSelected] = useState<ProdutoDetalhe | null>(null);
  const [open, setOpen] = useState(false);

  const { data: produtos, isLoading, error } = useQuery({
    queryKey: ["produtos-loja"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("produtos")
        .select("id, nome, descricao, preco, imagem_url, imagens, estoque, controla_estoque")
        .eq("ativo", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as ProdutoDetalhe[];
    },
  });

  const openProduct = (p: ProdutoDetalhe) => {
    setSelected(p);
    setOpen(true);
  };

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
          <div className="text-center py-16 text-destructive">Erro ao carregar produtos.</div>
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
              <ProductCard key={p.id} produto={p} onOpen={() => openProduct(p)} />
            ))}
          </div>
        )}
      </main>

      <footer className="border-t mt-16 py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} — Todos os direitos reservados.
      </footer>

      <ProductDetailDialog produto={selected} open={open} onOpenChange={setOpen} />
    </div>
  );
}

function ProductCard({ produto, onOpen }: { produto: ProdutoDetalhe; onOpen: () => void }) {
  const { add } = useCart();
  const [hoverIdx, setHoverIdx] = useState(0);

  const gallery = [produto.imagem_url, ...(produto.imagens ?? [])].filter(Boolean) as string[];
  const currentImage = gallery[hoverIdx] ?? gallery[0] ?? null;
  const semEstoque = produto.controla_estoque && (produto.estoque ?? 0) <= 0;

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    add({
      id: produto.id,
      nome: produto.nome,
      preco: Number(produto.preco),
      imagem_url: produto.imagem_url,
    });
    toast.success(`${produto.nome} adicionado ao carrinho`);
  };

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (gallery.length < 2) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const idx = Math.min(gallery.length - 1, Math.max(0, Math.floor((x / rect.width) * gallery.length)));
    setHoverIdx(idx);
  };

  return (
    <div
      onClick={onOpen}
      className="group cursor-pointer rounded-xl border bg-card overflow-hidden flex flex-col hover:shadow-lg transition-shadow"
    >
      <div
        className="aspect-square bg-white overflow-hidden relative"
        onMouseMove={handleMove}
        onMouseLeave={() => setHoverIdx(0)}
      >
        {currentImage ? (
          <img
            src={currentImage}
            alt={produto.nome}
            loading="lazy"
            className="h-full w-full object-contain transition-opacity duration-200"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-muted-foreground">
            <ShoppingBag className="h-10 w-10" />
          </div>
        )}
        {gallery.length > 1 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {gallery.map((_, i) => (
              <span
                key={i}
                className={`h-1 w-4 rounded-full transition ${
                  i === hoverIdx ? "bg-primary" : "bg-muted-foreground/30"
                }`}
              />
            ))}
          </div>
        )}
      </div>
      <div className="p-4 flex flex-col flex-1 gap-2">
        <h3 className="font-semibold text-sm md:text-base line-clamp-2 min-h-[2.5rem]">{produto.nome}</h3>
        {produto.descricao && (
          <p className="text-xs text-muted-foreground line-clamp-2">{produto.descricao}</p>
        )}
        <div className="mt-auto space-y-1">
          <p className="text-xl font-bold">{formatBRL(Number(produto.preco))}</p>
          <p className="text-[11px] text-primary">
            3x de {formatBRL(Number(produto.preco) / 3)} sem juros
          </p>
          <p className="text-[11px] text-emerald-600 flex items-center gap-1">
            <Truck className="h-3 w-3" /> Frete grátis
          </p>
        </div>
        <Button onClick={handleAdd} disabled={semEstoque} className="w-full mt-2" size="sm">
          {semEstoque ? "Esgotado" : "Adicionar ao carrinho"}
        </Button>
      </div>
    </div>
  );
}
