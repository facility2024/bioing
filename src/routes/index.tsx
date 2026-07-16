import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ShoppingBag, Package, Truck, Search, User, PackageSearch, Menu, ChevronLeft, ChevronRight } from "lucide-react";
import { CartProvider, useCart, formatBRL } from "@/hooks/use-cart";
import { CartDrawer } from "@/components/cart-drawer";
import { ProductDetailDialog, type ProdutoDetalhe } from "@/components/product-detail-dialog";
import { HomeSlider } from "@/components/home-slider";
import { toast } from "sonner";

const LOGO_URL = "/ingredientes-bio-logo.png";

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

type ProdutoLoja = ProdutoDetalhe & { secao?: number | null };

function Storefront() {
  const [selected, setSelected] = useState<ProdutoDetalhe | null>(null);
  const [open, setOpen] = useState(false);
  const [busca, setBusca] = useState("");

  const { data: produtos, isLoading, error } = useQuery({
    queryKey: ["produtos-loja"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("produtos")
        .select("id, nome, descricao, preco, imagem_url, imagens, estoque, controla_estoque, secao")
        .eq("ativo", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as ProdutoLoja[];
    },
  });

  const { data: secoes } = useQuery({
    queryKey: ["home-secoes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("home_secoes")
        .select("numero, titulo, ativo, imagem_url")
        .order("numero", { ascending: true });
      if (error) throw error;
      return (data ?? []) as { numero: number; titulo: string; ativo: boolean; imagem_url: string | null }[];
    },
    staleTime: 0,
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

  const openProduct = (p: ProdutoDetalhe) => {
    setSelected(p);
    setOpen(true);
  };

  // Abre produto direto quando vier ?produto=<id> na URL
  useEffect(() => {
    if (!produtos || produtos.length === 0) return;
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const pid = params.get("produto");
    if (!pid) return;
    const p = produtos.find((x) => x.id === pid);
    if (p) {
      setSelected(p);
      setOpen(true);
    }
    params.delete("produto");
    const qs = params.toString();
    const url = window.location.pathname + (qs ? `?${qs}` : "") + window.location.hash;
    window.history.replaceState({}, "", url);
  }, [produtos]);

  const buscando = busca.trim().length > 0;
  const secoesAtivas = (secoes ?? []).filter((s) => s.ativo);

  return (
    <div className="min-h-screen bg-background">
      <StoreHeader busca={busca} setBusca={setBusca} />

      <main className="max-w-6xl mx-auto px-3 sm:px-4 py-6 sm:py-8 space-y-10">
        {isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
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

        {/* Modo busca: exibe todos os produtos filtrados numa única grade */}
        {buscando && produtos && produtos.length > 0 && (
          <>
            {filtrados.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                Nenhum produto encontrado para “{busca}”.
              </div>
            ) : (
              <ProdutosCarousel produtos={filtrados} onOpen={openProduct} />
            )}
          </>
        )}

        {/* Modo normal: 4 seções em sequência (banner + título + produtos) */}
        {!buscando && !isLoading && !error && produtos && produtos.length > 0 &&
          secoesAtivas.map((s) => {
            const prods = filtrados.filter((p) => (p.secao ?? 1) === s.numero);
            return (
              <SecaoHome
                key={s.numero}
                numero={s.numero}
                titulo={s.titulo}
                imagemUrl={s.imagem_url}
                produtos={prods}
                onOpen={openProduct}
              />
            );
          })}
      </main>

      <ProductDetailDialog produto={selected} open={open} onOpenChange={setOpen} />
    </div>
  );
}

function SecaoHome({
  numero,
  titulo,
  imagemUrl,
  produtos,
  onOpen,
}: {
  numero: number;
  titulo: string;
  imagemUrl?: string | null;
  produtos: ProdutoLoja[];
  onOpen: (p: ProdutoDetalhe) => void;
}) {
  return (
    <section className="space-y-4">
      <div className="-mx-3 sm:-mx-4 lg:mx-[calc(50%-50vw)]">
        <HomeSlider secao={numero} />
      </div>
      {(titulo || imagemUrl) && (
        <div className="flex items-center gap-3 px-1">
          {imagemUrl && (
            <img
              src={imagemUrl}
              alt=""
              className="h-9 w-9 sm:h-10 sm:w-10 rounded-full object-cover ring-1 ring-black/5 shrink-0"
            />
          )}
          {titulo && (
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">{titulo}</h2>
          )}
        </div>
      )}
      {produtos.length === 0 ? (
        <p className="text-sm text-muted-foreground px-1">
          Nenhum produto nesta seção ainda.
        </p>
      ) : (
        <ProdutosCarousel produtos={produtos} onOpen={onOpen} />
      )}
    </section>
  );
}

function ProdutosCarousel({
  produtos,
  onOpen,
}: {
  produtos: ProdutoLoja[];
  onOpen: (p: ProdutoDetalhe) => void;
}) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const updateArrows = () => {
    const el = scrollerRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    updateArrows();
  }, [produtos]);

  const scrollBy = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: "smooth" });
  };

  return (
    <div className="relative group">
      <button
        onClick={() => scrollBy(-1)}
        aria-label="Anterior"
        className={`absolute left-1 sm:-left-3 top-1/2 -translate-y-1/2 z-10 h-10 w-10 sm:h-11 sm:w-11 flex items-center justify-center rounded-full bg-white/95 backdrop-blur shadow-lg ring-1 ring-black/5 hover:bg-white hover:scale-105 transition-all ${
          canPrev ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
      </button>

      <div
        ref={scrollerRef}
        onScroll={updateArrows}
        className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth gap-3 sm:gap-4 -mx-3 sm:-mx-4 px-3 sm:px-4 pb-2 no-scrollbar"
        style={{ scrollbarWidth: "none" }}
      >
        {produtos.map((p) => (
          <div
            key={p.id}
            className="snap-start shrink-0 w-[calc((100%-0.75rem)/2)] sm:w-[calc((100%-2rem)/3)] md:w-[calc((100%-3rem)/4)] lg:w-[calc((100%-4rem)/5)]"
          >
            <ProductCard produto={p} onOpen={() => onOpen(p)} />
          </div>
        ))}
      </div>

      <button
        onClick={() => scrollBy(1)}
        aria-label="Próxima"
        className={`absolute right-1 sm:-right-3 top-1/2 -translate-y-1/2 z-10 h-10 w-10 sm:h-11 sm:w-11 flex items-center justify-center rounded-full bg-white/95 backdrop-blur shadow-lg ring-1 ring-black/5 hover:bg-white hover:scale-105 transition-all ${
          canNext ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
      </button>
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
            alt="Ingredientes Bio"
            width={180}
            height={110}
            className="h-12 sm:h-14 md:h-16 w-auto object-contain"
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
                    <span className="text-xs text-muted-foreground">Boas-vindas</span>
                    <span className="text-sm font-semibold">Admin — Entrar</span>
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
          {/* Badge "Frete grátis" oculto — reativar quando solicitado */}
          {false && (
            <p className="text-[11px] text-emerald-600 flex items-center gap-1">
              <Truck className="h-3 w-3" /> Frete grátis
            </p>
          )}
        </div>
        <Button onClick={handleAdd} disabled={semEstoque} className="w-full mt-2" size="sm">
          {semEstoque ? "Esgotado" : "Adicionar ao carrinho"}
        </Button>
      </div>
    </div>
  );
}

function Pagination({
  current,
  total,
  onChange,
}: {
  current: number;
  total: number;
  onChange: (n: number) => void;
}) {
  const pages: (number | "…")[] = [];
  const push = (v: number | "…") => pages.push(v);
  const window = 1;
  push(1);
  const start = Math.max(2, current - window);
  const end = Math.min(total - 1, current + window);
  if (start > 2) push("…");
  for (let i = start; i <= end; i++) push(i);
  if (end < total - 1) push("…");
  if (total > 1) push(total);

  return (
    <nav className="mt-8 flex items-center justify-center gap-1 flex-wrap" aria-label="Paginação">
      <button
        onClick={() => onChange(Math.max(1, current - 1))}
        disabled={current === 1}
        className="h-9 px-3 rounded-md border text-sm hover:bg-muted disabled:opacity-40 disabled:pointer-events-none transition-colors"
      >
        Anterior
      </button>
      {pages.map((p, i) =>
        p === "…" ? (
          <span key={`e-${i}`} className="h-9 w-9 grid place-items-center text-muted-foreground">…</span>
        ) : (
          <button
            key={p}
            onClick={() => onChange(p)}
            aria-current={p === current ? "page" : undefined}
            className={`h-9 min-w-9 px-3 rounded-md border text-sm transition-colors ${
              p === current
                ? "bg-primary text-primary-foreground border-primary"
                : "hover:bg-muted"
            }`}
          >
            {p}
          </button>
        ),
      )}
      <button
        onClick={() => onChange(Math.min(total, current + 1))}
        disabled={current === total}
        className="h-9 px-3 rounded-md border text-sm hover:bg-muted disabled:opacity-40 disabled:pointer-events-none transition-colors"
      >
        Próxima
      </button>
    </nav>
  );
}
