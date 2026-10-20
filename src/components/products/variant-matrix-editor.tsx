import { useState } from "react";
import { Plus, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buildMatrix, mergeLabels, norm, parseList, rowKey, type MatrixRow, type ProductSpec } from "@/lib/variant-matrix";

/** Chip list with a bulk input: "أحمر، أزرق، أسود" + Enter adds all at once. */
function LabelList({
  title, placeholder, values, onChange,
}: { title: string; placeholder: string; values: string[]; onChange: (v: string[]) => void }) {
  const [text, setText] = useState("");
  function commit() {
    const add = parseList(text);
    if (add.length) onChange(mergeLabels(values, add));
    setText("");
  }
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium">{title}</label>
      <div className="flex gap-2">
        <Input
          value={text}
          placeholder={placeholder}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commit(); } }}
          onBlur={commit}
        />
        <Button type="button" size="sm" variant="outline" onClick={commit}><Plus className="h-4 w-4" /></Button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {values.map((v) => (
            <span key={v} className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs">
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
  const [bulkStock, setBulkStock] = useState("");
  const [bulkPrice, setBulkPrice] = useState("");

  const setLists = (c: string[], s: string[]) => onChange({ colors: c, sizes: s, rows: buildMatrix(c, s, rows) });
  const patch = (key: string, p: Partial<MatrixRow>) =>
    onChange({ colors, sizes, rows: rows.map((r) => (rowKey(r.color, r.size) === key ? { ...r, ...p } : r)) });
  const applyAll = (p: Partial<MatrixRow>) =>
    onChange({ colors, sizes, rows: rows.map((r) => (r.enabled ? { ...r, ...p } : r)) });

  const enabled = rows.filter((r) => r.enabled);
  const total = enabled.reduce((n, r) => n + (Number(r.stock) || 0), 0);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <LabelList title="الألوان (اختياري)" placeholder="أحمر، أزرق، أسود" values={colors} onChange={(c) => setLists(c, sizes)} />
        <LabelList title="المقاسات (اختياري)" placeholder="S, M, L, XL" values={sizes} onChange={(s) => setLists(colors, s)} />
      </div>
      <p className="text-xs text-muted-foreground">
        اكتب كل الألوان أو المقاسات مرة واحدة مفصولة بفاصلة، وهتتعمل كل التركيبات تلقائيًا. لو المنتج بدون ألوان أو مقاسات سيبها فاضية.
      </p>

      <div className="flex flex-wrap items-end gap-2 rounded-lg bg-muted/40 p-2">
        <label className="space-y-1 text-xs">كمية للكل
          <Input className="h-8 w-24" type="number" min={0} value={bulkStock} onChange={(e) => setBulkStock(e.target.value)} />
        </label>
        <Button type="button" size="sm" variant="outline" disabled={bulkStock === ""} onClick={() => applyAll({ stock: bulkStock })}>تطبيق</Button>
        <label className="space-y-1 text-xs">سعر للكل
          <Input className="h-8 w-24" type="number" min={0} value={bulkPrice} placeholder={basePrice} onChange={(e) => setBulkPrice(e.target.value)} />
        </label>
        <Button type="button" size="sm" variant="outline" onClick={() => applyAll({ price: bulkPrice })}>تطبيق</Button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th className="p-2 text-start">متوفر</th>
              <th className="p-2 text-start">التركيبة</th>
              <th className="p-2 text-start">الكمية</th>
              <th className="p-2 text-start">السعر</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const key = rowKey(r.color, r.size);
              const label = [r.color, r.size].filter(Boolean).join(" / ") || "المنتج (بدون اختيارات)";
              return (
                <tr key={key} className={`border-t border-border ${r.enabled ? "" : "opacity-50"}`}>
                  <td className="p-2">
                    <input type="checkbox" aria-label={`متوفر ${label}`} checked={r.enabled} onChange={(e) => patch(key, { enabled: e.target.checked })} className="h-4 w-4 accent-primary" />
                  </td>
                  <td className="p-2 font-medium">{label}</td>
                  <td className="p-2">
                    <Input className="h-8 w-20" type="number" min={0} placeholder="0" disabled={!r.enabled} value={r.stock} onChange={(e) => patch(key, { stock: e.target.value })} />
                  </td>
                  <td className="p-2">
                    <Input className="h-8 w-24" type="number" min={0} placeholder={basePrice || "السعر"} disabled={!r.enabled} value={r.price} onChange={(e) => patch(key, { price: e.target.value })} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        {enabled.length} تركيبة متوفرة · إجمالي الكمية {total}. شيل علامة «متوفر» من أي تركيبة مش موجودة عندك. السعر الفاضي = السعر الأساسي.
      </p>
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
