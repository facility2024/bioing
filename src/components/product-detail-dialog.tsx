import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogHeader } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Minus, Plus, ShoppingCart, Truck, ShieldCheck, Package, FileText } from "lucide-react";
import { formatBRL, useCart } from "@/hooks/use-cart";
import { toast } from "sonner";

export type ProdutoDetalhe = {
  id: string;
  nome: string;
  descricao: string | null;
  preco: number;
  imagem_url: string | null;
  imagens?: string[] | null;
  estoque: number | null;
  controla_estoque: boolean;
};

export function ProductDetailDialog({
  produto,
  open,
  onOpenChange,
}: {
  produto: ProdutoDetalhe | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { add } = useCart();
  const [qty, setQty] = useState(1);
  const [selected, setSelected] = useState(0);
  const [descOpen, setDescOpen] = useState(false);

  const gallery = produto
    ? [produto.imagem_url, ...(produto.imagens ?? [])].filter(Boolean) as string[]
    : [];

  useEffect(() => {
    if (open) {
      setQty(1);
      setSelected(0);
    }
  }, [open, produto?.id]);

  if (!produto) return null;

  const semEstoque = produto.controla_estoque && (produto.estoque ?? 0) <= 0;
  const mainImage = gallery[selected] ?? gallery[0];

  const handleAdd = () => {
    add(
      {
        id: produto.id,
        nome: produto.nome,
        preco: Number(produto.preco),
        imagem_url: produto.imagem_url,
      },
      qty,
    );
    toast.success(`${produto.nome} adicionado ao carrinho`);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[95vw] sm:w-full sm:max-w-5xl p-0 gap-0 overflow-hidden max-h-[92vh] flex flex-col">
          <DialogTitle className="sr-only">{produto.nome}</DialogTitle>
          <div className="flex flex-col lg:grid lg:grid-cols-[1fr_360px] overflow-y-auto">
            {/* Image column */}
            <div className="p-4 md:p-6 flex flex-col gap-4 bg-white min-h-[280px]">
              <div className="flex-1 flex items-center justify-center">
                {mainImage ? (
                  <MagnifierImage src={mainImage} alt={produto.nome} />
                ) : (
                  <div className="h-64 w-full grid place-items-center text-muted-foreground">
                    <Package className="h-16 w-16" />
                  </div>
                )}
              </div>

              {/* Thumbnails below the image */}
              {gallery.length > 1 && (
                <div className="flex gap-2 flex-wrap justify-center">
                  {gallery.map((img, i) => (
                    <button
                      key={img + i}
                      type="button"
                      onMouseEnter={() => setSelected(i)}
                      onClick={() => setSelected(i)}
                      className={`h-14 w-14 md:h-16 md:w-16 rounded border overflow-hidden bg-white transition ${
                        selected === i
                          ? "border-primary ring-2 ring-primary/30"
                          : "border-border hover:border-primary/60"
                      }`}
                    >
                      <img src={img} alt="" className="h-full w-full object-contain" />
                    </button>
                  ))}
                </div>
              )}

              {/* Descrição button */}
              {produto.descricao && (
                <Button
                  variant="outline"
                  onClick={() => setDescOpen(true)}
                  className="w-full"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Descrição
                </Button>
              )}
            </div>

            {/* Info column */}
            <div className="p-4 md:p-6 border-t lg:border-t-0 lg:border-l flex flex-col gap-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Novo</span>
                <span>·</span>
                <span>Disponível</span>
              </div>

              <h2 className="text-lg md:text-xl font-semibold leading-tight break-words">{produto.nome}</h2>

              <div className="space-y-1">
                <p className="text-2xl md:text-3xl font-semibold">{formatBRL(Number(produto.preco))}</p>
                <p className="text-xs text-primary">
                  3x de {formatBRL(Number(produto.preco) / 3)} sem juros
                </p>
              </div>

              <div className="rounded-lg border p-3 space-y-2 text-sm">
                <div className="flex items-center gap-2 text-emerald-600">
                  <Truck className="h-4 w-4" />
                  <span className="font-medium">Frete grátis</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <ShieldCheck className="h-4 w-4" />
                  <span>Compra garantida</span>
                </div>
              </div>

              {produto.controla_estoque && (
                <Badge variant="secondary" className="w-fit">
                  Estoque: {produto.estoque ?? 0} unid.
                </Badge>
              )}

              <div className="flex items-center gap-3">
                <span className="text-sm">Quantidade:</span>
                <div className="inline-flex items-center rounded-md border">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    disabled={qty <= 1}
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </Button>
                  <span className="w-8 text-center text-sm">{qty}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setQty((q) => q + 1)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <div className="flex flex-col gap-2 mt-auto">
                <div className="flex items-baseline justify-between rounded-lg border bg-muted/40 p-3">
                  <span className="text-sm text-muted-foreground">Subtotal ({qty} {qty > 1 ? "itens" : "item"})</span>
                  <span className="text-xl font-bold">{formatBRL(Number(produto.preco) * qty)}</span>
                </div>
                <Button onClick={handleAdd} disabled={semEstoque} size="lg">
                  {semEstoque ? "Esgotado" : "Comprar agora"}
                </Button>
                <Button
                  onClick={handleAdd}
                  disabled={semEstoque}
                  size="lg"
                  variant="secondary"
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Adicionar ao carrinho
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Description popup */}
      <Dialog open={descOpen} onOpenChange={setDescOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Descrição do produto</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
            {produto.descricao}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function MagnifierImage({ src, alt }: { src: string; alt: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const LENS = 160;
  const ZOOM = 2.5;

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setPos({ x, y });
  };

  return (
    <div
      ref={ref}
      className="relative w-full max-h-[55vh] flex items-center justify-center cursor-zoom-in select-none"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onMouseMove={handleMove}
    >
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        onLoad={(e) => {
          const t = e.currentTarget;
          setNatural({ w: t.naturalWidth, h: t.naturalHeight });
        }}
        className="max-h-[55vh] w-full object-contain pointer-events-none"
        draggable={false}
      />
      {show && imgRef.current && natural.w > 0 && (() => {
        const imgEl = imgRef.current;
        const contRect = ref.current!.getBoundingClientRect();
        const imgRect = imgEl.getBoundingClientRect();
        const relX = pos.x - (imgRect.left - contRect.left);
        const relY = pos.y - (imgRect.top - contRect.top);
        if (relX < 0 || relY < 0 || relX > imgRect.width || relY > imgRect.height) return null;
        const bgW = imgRect.width * ZOOM;
        const bgH = imgRect.height * ZOOM;
        const bgX = -(relX * ZOOM - LENS / 2);
        const bgY = -(relY * ZOOM - LENS / 2);
        return (
          <div
            className="pointer-events-none absolute rounded-full border-2 border-primary shadow-xl overflow-hidden bg-white"
            style={{
              width: LENS,
              height: LENS,
              left: pos.x - LENS / 2,
              top: pos.y - LENS / 2,
              backgroundImage: `url(${src})`,
              backgroundRepeat: "no-repeat",
              backgroundSize: `${bgW}px ${bgH}px`,
              backgroundPosition: `${bgX}px ${bgY}px`,
            }}
          />
        );
      })()}
    </div>
  );
}

