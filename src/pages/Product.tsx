import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { productById, products, categoryLabel, collectionLabel } from "../data/catalog";
import { SIZE_CHART, recommendSize } from "../data/sizing";
import { useCart } from "../store/cart";
import { useBodyProfile } from "../store/bodyProfile";
import ProductImage from "../components/ProductImage";
import ProductCard, { vnd } from "../components/ProductCard";
import NotFound from "./NotFound";
import { supabase } from "../lib/supabase";

interface SizeChartRow {
  id: string;
  size: string;
  bust_min: number;
  bust_max: number;
  waist_min: number;
  waist_max: number;
  hip_min: number;
  hip_max: number;
  sort_order: number;
}

function useSizeChart() {
  const [rows, setRows] = useState<SizeChartRow[]>([]);
  useEffect(() => {
    supabase
      .from("size_chart")
      .select("*")
      .order("sort_order")
      .then(({ data }) => {
        if (data?.length) setRows(data as SizeChartRow[]);
      });
  }, []);
  // fallback to hardcoded if Supabase not yet populated
  if (rows.length) return rows;
  return SIZE_CHART.map((r, i) => ({
    id: r.size,
    size: r.size,
    bust_min: r.bust[0], bust_max: r.bust[1],
    waist_min: r.waist[0], waist_max: r.waist[1],
    hip_min: r.hip[0], hip_max: r.hip[1],
    sort_order: i,
  }));
}

function SizeGuideModal({ open, onClose, recSize }: { open: boolean; onClose: () => void; recSize?: string }) {
  const chart = useSizeChart();

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl bg-white p-8 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-5 top-5 text-ink-soft hover:text-ink transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        <h2 className="font-serif text-2xl">Size guide</h2>
        <p className="mt-1.5 text-sm text-ink-soft">
          Save once — get automatic size recommendations for every product.
        </p>

        <div className="mt-5 border-t border-[var(--color-line)]" />

        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="text-left text-ink-soft">
              <th className="py-3 font-normal">Size</th>
              <th className="py-3 font-normal">Bust (cm)</th>
              <th className="py-3 font-normal">Waist (cm)</th>
              <th className="py-3 font-normal">Hips (cm)</th>
            </tr>
          </thead>
          <tbody>
            {chart.map((r) => {
              const isRec = recSize === r.size;
              return (
                <tr
                  key={r.id}
                  className={`border-t border-[var(--color-line)] ${isRec ? "font-medium" : ""}`}
                >
                  <td className="py-3">
                    {r.size}
                    {isRec && <span className="ml-1.5 text-[11px] text-[var(--color-accent)]">• you</span>}
                  </td>
                  <td className="py-3">{r.bust_min}–{r.bust_max}</td>
                  <td className="py-3">{r.waist_min}–{r.waist_max}</td>
                  <td className="py-3">{r.hip_min}–{r.hip_max}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function Product() {
  const { id } = useParams();
  const product = id ? productById(id) : undefined;

  const add = useCart((s) => s.add);
  const measurements = useBodyProfile((s) => s.measurements);
  const openBody = useBodyProfile((s) => s.setModal);

  const [size, setSize] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);

  const stdSizes = useMemo(() => (product ? product.sizes.filter((s) => s !== "Custom") : []), [product]);
  const rec = useMemo(
    () => (product && measurements ? recommendSize(measurements, stdSizes) : null),
    [product, measurements, stdSizes],
  );

  if (!product) return <NotFound />;

  const handleAdd = () => {
    if (!size) setSize(rec?.size ?? product.sizes[0]);
    add({
      id: product.id,
      name: product.name,
      price: product.price,
      size: size ?? rec?.size ?? product.sizes[0],
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <div className="pt-[62px]">
      <SizeGuideModal open={sizeGuideOpen} onClose={() => setSizeGuideOpen(false)} recSize={rec?.size} />

      <div className="mx-auto grid max-w-[1800px] lg:grid-cols-[1fr_500px] xl:grid-cols-[1fr_560px]">
        {/* gallery */}
        <div className="grid grid-cols-1">
          {(product.images?.length ? product.images.map((_, i) => i) : [0, 3, 6]).map((idx, n) => (
            <div
              key={n}
              className="aspect-[3/4] overflow-hidden bg-[var(--color-tile)]"
            >
              <ProductImage item={product} index={idx} className="h-full w-full" />
            </div>
          ))}
        </div>

        {/* info (sticky) */}
        <div className="lg:sticky lg:top-[62px] lg:h-fit">
          <div className="px-5 py-10 md:px-10 lg:px-12 lg:py-14">
            <p className="text-xs text-ink-soft">
              <Link to="/shop" className="link-underline">
                {categoryLabel(product.category)}
              </Link>
              <span className="mx-1.5">·</span>
              {collectionLabel(product.collection)}
            </p>

            <h1 className="mt-3 font-serif text-3xl">{product.name}</h1>
            <p className="mt-2 font-serif text-lg">{vnd(product.price)}</p>
            <p className="mt-5 max-w-md text-sm leading-relaxed text-ink-soft">{product.blurb}</p>

            {/* size + recommendation */}
            {product && (
              <div className="mt-7">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-ink-soft">Size</p>
                  <div className="flex items-center gap-3">
                    {rec ? (
                      <span className="text-xs text-[var(--color-accent)]">
                        Your profile ⭢ best fit <b>size {rec.size}</b>
                      </span>
                    ) : (
                      <button onClick={() => openBody(true)} className="text-xs text-ink-soft underline underline-offset-2">
                        Enter measurements
                      </button>
                    )}
                    <button
                      onClick={() => setSizeGuideOpen(true)}
                      className="text-[11px] tracking-[0.1em] uppercase underline underline-offset-2 text-ink-soft hover:text-ink transition-colors"
                    >
                      Size Guide
                    </button>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {product.sizes.map((s) => {
                    const isRec = rec?.size === s;
                    const on = size === s;
                    return (
                      <button
                        key={s}
                        onClick={() => setSize(s)}
                        className={`relative min-w-11 rounded border px-3 py-2 text-sm transition-colors ${
                          on ? "border-ink bg-ink text-white" : "edge hover:border-ink"
                        }`}
                      >
                        {s}
                        {isRec && !on && (
                          <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-[var(--color-accent)]" />
                        )}
                      </button>
                    );
                  })}
                </div>
                {rec && (
                  <p className="mt-2 rounded bg-[var(--color-tile)] px-3 py-2 text-xs text-ink-soft">
                    Recommendation based on your profile · fit {rec.confidence}
                    {rec.notes.length > 0 && <> — {rec.notes.join("; ")}.</>}
                  </p>
                )}
              </div>
            )}

            {/* actions */}
            <button
              onClick={handleAdd}
              className="mt-8 flex h-12 w-full max-w-[380px] items-center justify-center gap-2 rounded-lg bg-ink text-white transition-opacity hover:opacity-85"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0" />
              </svg>
              <span className="label text-white">{added ? "ADDED TO CART ✓" : "ADD TO CART"}</span>
            </button>
            {product?.customizable && (
              <button className="mt-3 block text-xs text-[var(--color-accent)] underline underline-offset-2">
                Request custom sizing based on my profile →
              </button>
            )}

            {/* body-type compatibility */}
            {product && (
              <div className="mt-8 flex gap-3 rounded-md bg-[var(--color-tile)] px-4 py-3">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="mt-0.5 shrink-0 text-ink-soft">
                  <path d="M12 2C9 2 7 5 7 8s1 4 2 5l-4 9h14l-4-9c1-1 2-3 2-5s-2-6-5-6z" />
                </svg>
                <div>
                  <p className="text-xs font-medium">Body Type Compatibility</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">{product.bodyType}</p>
                </div>
              </div>
            )}

            {/* accordions */}
            <div className="mt-8">
              {product && (
                <Accordion title="Material & Care">
                  <p className="mb-2">Material: {product.material}</p>
                  <ul className="list-disc space-y-1 pl-4">
                    {product.care.map((c) => <li key={c}>{c}</li>)}
                  </ul>
                </Accordion>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* similar */}
      <section className="mx-auto max-w-[1800px] px-5 py-16 md:px-8">
        <h2 className="mb-8 font-serif text-2xl">You might also like</h2>
        <div className="grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-4 md:gap-x-6">
          {products.filter((p) => p.id !== product.id).slice(0, 4).map((p, i) => (
            <ProductCard key={p.id} item={p} index={i} />
          ))}
        </div>
      </section>
    </div>
  );
}

function Accordion({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="group border-t edge py-4">
      <summary className="flex cursor-pointer list-none items-center justify-between text-xs uppercase tracking-[0.02em]">
        {title}
        <span className="text-ink-soft transition-transform group-open:rotate-45">+</span>
      </summary>
      <div className="mt-3 text-xs leading-relaxed text-ink-soft">{children}</div>
    </details>
  );
}
