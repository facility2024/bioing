import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ShoppingBag, Package, Truck, Search, User, PackageSearch, Menu } from "lucide-react";
import { CartProvider, useCart, formatBRL } from "@/hooks/use-cart";
import { CartDrawer } from "@/components/cart-drawer";
import { ProductDetailDialog, type ProdutoDetalhe } from "@/components/product-detail-dialog";
import { HomeSlider } from "@/components/home-slider";
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

const PAGE_SIZE = 10;

function Storefront() {
  const [selected, setSelected] = useState<ProdutoDetalhe | null>(null);
  const [open, setOpen] = useState(false);
  const [busca, setBusca] = useState("");
  const [page, setPage] = useState(1);

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

  const filtrados = useMemo(() => {
    if (!produtos) return [];
    const q = busca.trim().toLowerCase();
    if (!q) return produtos;
    return produtos.filter(
      (p) =>
        p.nome.toLowerCase().includes(q) ||
        (p.descricao ?? "").toLowerCase().includes(q),
    );
  }, [produtos, busca]);

  const totalPages = Math.max(1, Math.ceil(filtrados.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = useMemo(
    () => filtrados.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filtrados, currentPage],
  );

  // reset to page 1 when search changes
  useEffect(() => setPage(1), [busca]);

  const openProduct = (p: ProdutoDetalhe) => {
    setSelected(p);
    setOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <StoreHeader busca={busca} setBusca={setBusca} />

      <HomeSlider />

      <main className="max-w-6xl mx-auto px-4 py-8">
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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

        {produtos && produtos.length > 0 && filtrados.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            Nenhum produto encontrado para “{busca}”.
          </div>
        )}

        {pageItems.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {pageItems.map((p) => (
                <ProductCard key={p.id} produto={p} onOpen={() => openProduct(p)} />
              ))}
            </div>

            {totalPages > 1 && (
              <Pagination
                current={currentPage}
                total={totalPages}
                onChange={(n) => {
                  setPage(n);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              />
            )}
          </>
        )}
      </main>

      <ProductDetailDialog produto={selected} open={open} onOpenChange={setOpen} />
    </div>
  );
}

function StoreHeader({ busca, setBusca }: { busca: string; setBusca: (v: string) => void }) {
  const { count, total } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="bg-header sticky top-0 z-20 border-b">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-3 grid grid-cols-[auto_1fr_auto] items-center gap-2 sm:gap-3">
        <Link to="/" className="shrink-0">
          <img
            src={LOGO_URL}
            alt="Logo"
            width={64}
            height={64}
            className="h-10 w-10 sm:h-14 sm:w-14 md:h-16 md:w-16 object-contain rounded-md bg-white p-1"
          />
        </Link>

        <div className="min-w-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar produtos..."
              className="pl-9 bg-white h-10 rounded-full w-full"
            />
          </div>
        </div>

        {/* Desktop actions */}
        <nav className="hidden md:flex items-center gap-3 text-white">
          <HeaderAction
            to="/auth"
            icon={<User className="h-5 w-5" />}
            title="Boas-vindas"
            subtitle="Admin"
          />
          <HeaderAction
            onClick={() =>
              toast.info("Para acompanhar seu pedido, entre em contato pelo WhatsApp da loja.")
            }
            icon={<PackageSearch className="h-5 w-5" />}
            title="Acompanhar"
            subtitle="pedidos"
          />
          <div className="flex items-center gap-2">
            <CartDrawer />
            <div className="flex flex-col leading-tight text-white">
              <span className="text-[11px] opacity-90">Cesta</span>
              <span className="text-xs font-semibold">
                {count > 0 ? formatBRL(total) : "R$ 0,00"}
              </span>
            </div>
          </div>
        </nav>

        {/* Mobile actions */}
        <div className="flex md:hidden items-center gap-1 text-white">
          <CartDrawer />
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <button
                aria-label="Abrir menu"
                className="inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-white/10 transition-colors"
              >
                <Menu className="h-6 w-6" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <div className="mt-6 flex flex-col gap-2">
                <Link
                  to="/auth"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 rounded-md border px-3 py-3 hover:bg-muted transition-colors"
                >
                  <User className="h-5 w-5" />
                  <div className="flex flex-col leading-tight">
                    <span className="text-xs text-muted-foreground">Boas-vindas!</span>
                    <span className="text-sm font-semibold">Entrar ou cadastrar</span>
                  </div>
                </Link>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    toast.info("Para acompanhar seu pedido, entre em contato pelo WhatsApp da loja.");
                  }}
                  className="flex items-center gap-3 rounded-md border px-3 py-3 hover:bg-muted transition-colors text-left"
                >
                  <PackageSearch className="h-5 w-5" />
                  <div className="flex flex-col leading-tight">
                    <span className="text-xs text-muted-foreground">Acompanhar</span>
                    <span className="text-sm font-semibold">pedidos</span>
                  </div>
                </button>
                <div className="flex items-center gap-3 rounded-md border px-3 py-3">
                  <ShoppingBag className="h-5 w-5" />
                  <div className="flex flex-col leading-tight">
                    <span className="text-xs text-muted-foreground">Cesta</span>
                    <span className="text-sm font-semibold">
                      {count > 0 ? formatBRL(total) : "R$ 0,00"}
                    </span>
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

function HeaderAction({
  to,
  onClick,
  icon,
  title,
  subtitle,
}: {
  to?: string;
  onClick?: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  const content = (
    <span className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-white/10 transition-colors">
      <span className="shrink-0">{icon}</span>
      <span className="hidden md:flex flex-col leading-tight text-left">
        <span className="text-[11px] opacity-90">{title}</span>
        <span className="text-xs font-semibold">{subtitle}</span>
      </span>
    </span>
  );

  if (to) {
    return (
      <Link to={to} className="text-white">
        {content}
      </Link>
    );
  }
  return (
    <button onClick={onClick} className="text-white">
      {content}
    </button>
  );
}

function ProductCard({ produto, onOpen }: { produto: ProdutoDetalhe; onOpen: () => void }) {
  const { add } = useCart();

  const mainImage = produto.imagem_url ?? null;
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

  return (
    <div
      onClick={onOpen}
      className="group cursor-pointer rounded-xl border bg-card overflow-hidden flex flex-col hover:shadow-lg transition-shadow laser-bottom"
    >
      <div className="aspect-square bg-white overflow-hidden relative">
        {mainImage ? (
          <img
            src={mainImage}
            alt={produto.nome}
            loading="lazy"
            className="h-full w-full object-contain"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-muted-foreground">
            <ShoppingBag className="h-10 w-10" />
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
