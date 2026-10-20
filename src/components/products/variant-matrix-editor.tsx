import { useState } from "react";
import { Plus, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buildMatrix, mergeLabels, norm, parseList, rowKey, type MatrixRow, type ProductSpec } from "@/lib/variant-matrix";

const QUICK_SIZES = ["S", "M", "L", "XL", "XXL", "3XL"];

/** Chip list: type several at once ("أحمر، أزرق") or tap a quick chip. */
function LabelList({
  title, placeholder, values, onChange, quick = [],
}: { title: string; placeholder: string; values: string[]; onChange: (v: string[]) => void; quick?: string[] }) {
  const [text, setText] = useState("");
  function commit() {
    const add = parseList(text);
    if (add.length) onChange(mergeLabels(values, add));
    setText("");
  }
  const has = (v: string) => values.some((x) => norm(x) === norm(v));
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium">{title}</label>
      {quick.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {quick.map((q) => (
            <button key={q} type="button"
              onClick={() => onChange(has(q) ? values.filter((x) => norm(x) !== norm(q)) : [...values, q])}
              className={`min-w-11 rounded-md border px-3 py-1.5 text-sm font-medium transition ${has(q) ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background"}`}>
              {q}
            </button>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <Input value={text} placeholder={placeholder}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commit(); } }}
          onBlur={commit} />
        <Button type="button" size="sm" variant="outline" onClick={commit}><Plus className="h-4 w-4" /></Button>
      </div>
      {values.filter((v) => !quick.some((q) => norm(q) === norm(v))).length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {values.filter((v) => !quick.some((q) => norm(q) === norm(v))).map((v) => (
            <span key={v} className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2.5 py-1 text-xs">
              {v}
              <button type="button" aria-label={`حذف ${v}`} onClick={() => onChange(values.filter((x) => x !== v))}>
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function VariantMatrixEditor({
  colors, sizes, rows, basePrice, onChange,
}: {
  colors: string[];
  sizes: string[];
  rows: MatrixRow[];
  basePrice: string;
  onChange: (next: { colors: string[]; sizes: string[]; rows: MatrixRow[] }) => void;
}) {
  // Per-row price is hidden unless the merchant asks for it (or one already exists).
  const [showPrices, setShowPrices] = useState(() => rows.some((r) => r.price.trim() !== ""));

  const setLists = (c: string[], s: string[]) => onChange({ colors: c, sizes: s, rows: buildMatrix(c, s, rows) });
  const patch = (key: string, p: Partial<MatrixRow>) =>
    onChange({ colors, sizes, rows: rows.map((r) => (rowKey(r.color, r.size) === key ? { ...r, ...p } : r)) });
  const togglePrices = (on: boolean) => {
    setShowPrices(on);
    if (!on) onChange({ colors, sizes, rows: rows.map((r) => ({ ...r, price: "" })) });
  };

  const enabled = rows.filter((r) => r.enabled);
  const total = enabled.reduce((n, r) => n + (Number(r.stock) || 0), 0);

  return (
    <div className="space-y-4">
      <LabelList title="المقاسات" placeholder="مقاس آخر: 38، 40، فري سايز…" values={sizes} quick={QUICK_SIZES} onChange={(s) => setLists(colors, s)} />
      <LabelList title="الألوان" placeholder="اكتب الألوان: أسود، أبيض، كحلي" values={colors} onChange={(c) => setLists(c, sizes)} />

      <div className="space-y-2">
        <p className="text-xs font-medium">اكتب الكمية المتوفرة من كل قطعة (0 = مش متوفر)</p>
        <div className="divide-y divide-border rounded-lg border border-border">
          {rows.map((r) => {
            const key = rowKey(r.color, r.size);
            const label = [r.color, r.size].filter(Boolean).join(" — ") || "الكمية";
            return (
              <div key={key} className="flex items-center gap-2 p-2">
                <span className="flex-1 text-sm font-medium">{label}</span>
                <Input className="h-9 w-20 text-center" type="number" min={0} inputMode="numeric" placeholder="0"
                  aria-label={`كمية ${label}`} value={r.stock}
                  onChange={(e) => patch(key, { stock: e.target.value, enabled: true })} />
                {showPrices && (
                  <Input className="h-9 w-24 text-center" type="number" min={0} inputMode="numeric"
                    placeholder={basePrice || "السعر"} aria-label={`سعر ${label}`} value={r.price}
                    onChange={(e) => patch(key, { price: e.target.value })} />
                )}
              </div>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">إجمالي القطع: {total}</p>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input type="checkbox" className="h-4 w-4 accent-primary" checked={showPrices} onChange={(e) => togglePrices(e.target.checked)} />
          بعض المقاسات أو الألوان سعرها مختلف
        </label>
      </div>
    </div>
  );
}

/** Free-form product specs: الوزن، السعة، بلد الصنع… */
export function SpecsEditor({ specs, onChange }: { specs: ProductSpec[]; onChange: (s: ProductSpec[]) => void }) {
  return (
    <div className="space-y-2">
      {specs.map((s, i) => (
        <div key={i} className="flex gap-2">
          <Input className="w-1/3" placeholder="الخاصية (مثال: الوزن)" value={s.name} onChange={(e) => onChange(specs.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
          <Input className="flex-1" placeholder="القيمة (مثال: ٥٠٠ جم)" value={s.value} onChange={(e) => onChange(specs.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} />
          <Button type="button" size="icon" variant="ghost" aria-label="حذف الخاصية" onClick={() => onChange(specs.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
        </div>
      ))}
      <Button type="button" size="sm" variant="outline" onClick={() => onChange([...specs, { name: "", value: "" }])}>
        <Plus className="ml-1 h-3.5 w-3.5" /> إضافة خاصية
      </Button>
    </div>
  );
}

/** Image grouping chip: "عامة" or one of the colours. Optional by design. */
export function ImageGroupChips({ colors, value, onPick }: { colors: string[]; value: string; onPick: (color: string) => void }) {
  if (colors.length === 0) return <p className="mt-1 text-center text-[10px] text-muted-foreground">صورة عامة</p>;
  const opts = ["", ...colors];
  return (
    <div className="mt-1.5 flex flex-wrap justify-center gap-1">
      {opts.map((c) => {
        const active = norm(c) === norm(value);
        return (
          <button key={c || "_general"} type="button" onClick={() => onPick(c)}
            className={`rounded-full border px-2 py-0.5 text-[10px] font-medium transition ${active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:border-primary/60"}`}>
            {c || "عامة"}
          </button>
        );
      })}
    </div>
  );
}
