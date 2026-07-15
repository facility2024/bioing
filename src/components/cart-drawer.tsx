import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Minus, Plus, Trash2 } from "lucide-react";
import { useCart, formatBRL } from "@/hooks/use-cart";
import { useState } from "react";
import { CheckoutDialog } from "@/components/checkout-dialog";

export function CartDrawer() {
  const { items, count, total, setQty, remove, clear } = useCart();
  const [open, setOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);


  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="relative shrink-0" aria-label="Abrir carrinho">
          <ShoppingCart className="h-5 w-5" />
          {count > 0 && (
            <span className="absolute -top-1 -right-1 h-5 min-w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center px-1">
              {count}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Meu carrinho</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-3">
          {items.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Seu carrinho está vazio.
            </p>
          )}
          {items.map((item) => (
            <div key={item.id} className="flex gap-3 border rounded-lg p-3">
              <div className="h-16 w-16 shrink-0 rounded-md bg-muted overflow-hidden">
                {item.imagem_url && (
                  <img src={item.imagem_url} alt={item.nome} className="h-full w-full object-cover" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.nome}</p>
                <p className="text-sm text-muted-foreground">{formatBRL(item.preco)}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setQty(item.id, item.quantidade - 1)}>
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="text-sm w-6 text-center">{item.quantidade}</span>
                  <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setQty(item.id, item.quantidade + 1)}>
                    <Plus className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 ml-auto text-destructive" onClick={() => remove(item.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {items.length > 0 && (
          <SheetFooter className="flex-col gap-2 sm:flex-col">
            <div className="w-full space-y-1 pb-1">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Subtotal ({count} {count > 1 ? "itens" : "item"})</span>
                <span>{formatBRL(total)}</span>
              </div>
              <div className="flex justify-between text-base font-semibold">
                <span>Total</span>
                <span>{formatBRL(total)}</span>
              </div>
            </div>
            <Button
              className="w-full bg-header text-white hover:bg-header/90"
              size="lg"
              onClick={() => {
                setOpen(false);
                setCheckoutOpen(true);
              }}
            >
              Finalizar pedido
            </Button>

            <Button variant="ghost" className="w-full" onClick={clear}>
              Limpar carrinho
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
      <CheckoutDialog open={checkoutOpen} onOpenChange={setCheckoutOpen} />
    </Sheet>
  );
}

