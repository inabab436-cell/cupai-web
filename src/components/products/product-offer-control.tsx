import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BadgePercent, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  listProductPieceOffers,
  removeProductPieceOffer,
  setProductPieceOffer,
  type ProductPieceOffer,
} from "@/lib/product-offers.functions";

export const PIECE_OFFERS_KEY = ["product-piece-offers"];

export function usePieceOffers() {
  return useQuery({ queryKey: PIECE_OFFERS_KEY, queryFn: () => listProductPieceOffers() });
}

export function priceAfter(price: number, o: ProductPieceOffer): number {
  const d = o.discount_type === "percent" ? (price * o.discount_value) / 100 : o.discount_value;
  return Math.max(0, Math.round((price - d) * 100) / 100);
}

/** Offer summary + "إضافة عرض" / "إلغاء العرض" for one product. */
export function ProductOfferControl({
  productId, price, currency, offer,
}: {
  productId: string;
  price: number | null;
  currency: string | null;
  offer: ProductPieceOffer | null;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"percent" | "amount">("percent");
  const [value, setValue] = useState("");
  const cur = currency ?? "";
  const done = () => qc.invalidateQueries({ queryKey: PIECE_OFFERS_KEY });

  const save = useMutation({
    mutationFn: () =>
      setProductPieceOffer({ data: { productId, discount_type: type, discount_value: Number(value) } }),
    onSuccess: () => { toast.success("تم تفعيل العرض."); setOpen(false); setValue(""); done(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "تعذّر حفظ العرض."),
  });
  const cancel = useMutation({
    mutationFn: () => removeProductPieceOffer({ data: { productId } }),
    onSuccess: () => { toast.success("تم إلغاء العرض."); done(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "تعذّر إلغاء العرض."),
  });

  if (offer) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/50 px-2.5 py-2 text-xs">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <BadgePercent className="h-3.5 w-3.5 text-destructive" />
          <span className="font-semibold">
            {offer.discount_type === "percent" ? `خصم ${offer.discount_value}%` : `خصم ${offer.discount_value} ${cur} للقطعة`}
          </span>
          {price != null && price > 0 && (
            <>
              <span className="font-bold text-destructive">{priceAfter(price, offer)} {cur}</span>
              <span className="text-muted-foreground line-through">{price} {cur}</span>
            </>
          )}
        </div>
        <Button size="sm" variant="outline" type="button" className="h-7 px-2 text-xs"
          disabled={cancel.isPending} onClick={() => cancel.mutate()}>
          {cancel.isPending && <Loader2 className="ml-1 h-3 w-3 animate-spin" />}
          إلغاء العرض
        </Button>
      </div>
    );
  }

  if (!open) {
    return (
      <Button size="sm" variant="outline" type="button" className="h-8 gap-1 text-xs" onClick={() => setOpen(true)}>
        <BadgePercent className="h-3.5 w-3.5" /> إضافة عرض
      </Button>
    );
  }

  const n = Number(value);
  const preview = price != null && price > 0 && n > 0
    ? priceAfter(price, { offer_id: "", product_id: productId, discount_type: type, discount_value: n })
    : null;
  return (
    <div className="space-y-2 rounded-lg border border-border p-2.5">
      <div className="grid grid-cols-2 gap-2">
        <Button size="sm" type="button" variant={type === "percent" ? "default" : "outline"} onClick={() => setType("percent")}>نسبة مئوية %</Button>
        <Button size="sm" type="button" variant={type === "amount" ? "default" : "outline"} onClick={() => setType("amount")}>مبلغ من القطعة</Button>
      </div>
      <Input type="number" min={0} value={value} onChange={(e) => setValue(e.target.value)}
        placeholder={type === "percent" ? "مثال: 20" : "مثال: 100"} />
      {preview != null && (
        <p className="text-xs text-muted-foreground">
          السعر بعد الخصم: <span className="font-bold text-destructive">{preview} {cur}</span> بدل <span className="line-through">{price} {cur}</span>
        </p>
      )}
      <div className="grid grid-cols-2 gap-2">
        <Button size="sm" type="button" variant="ghost" onClick={() => setOpen(false)}>رجوع</Button>
        <Button size="sm" type="button" disabled={save.isPending || !(n > 0)} onClick={() => save.mutate()}>
          {save.isPending && <Loader2 className="ml-1 h-3 w-3 animate-spin" />}
          حفظ العرض
        </Button>
      </div>
    </div>
  );
}
