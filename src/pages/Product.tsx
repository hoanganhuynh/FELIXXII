import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { productById, products, categoryLabel, collectionLabel } from "../data/catalog";
import { SIZE_CHART } from "../data/sizing";
import { useCart } from "../store/cart";
import { useWishlist } from "../store/wishlist";
import { useAuth } from "../store/auth";
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

function SizeGuideModal({ open, onClose }: { open: boolean; onClose: () => void }) {
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
            {chart.map((r) => (
              <tr key={r.id} className="border-t border-[var(--color-line)]">
                <td className="py-3">{r.size}</td>
                <td className="py-3">{r.bust_min}–{r.bust_max}</td>
                <td className="py-3">{r.waist_min}–{r.waist_max}</td>
                <td className="py-3">{r.hip_min}–{r.hip_max}</td>
              </tr>
            ))}
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
  const { toggle: toggleWishlist, has: inWishlist } = useWishlist();
  const { user, setLoginOpen } = useAuth();
  const chart = useSizeChart();

  const [size, setSize] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);
  const galleryRef = useRef<HTMLDivElement>(null);

  if (!product) return <NotFound />;

  const selectedMeasurements = size ? chart.find((r) => r.size === size) : null;

  const handleAdd = () => {
    if (!size) setSize(product.sizes[0]);
    add({
      id: product.id,
      name: product.name,
      price: product.price,
      size: size ?? product.sizes[0],
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <div className="pt-[62px]">
      <SizeGuideModal open={sizeGuideOpen} onClose={() => setSizeGuideOpen(false)} />

      <div className="mx-auto grid max-w-[1800px] overflow-hidden lg:overflow-visible lg:grid-cols-[1fr_500px] xl:grid-cols-[1fr_560px]">
        {/* gallery — horizontal snap carousel on mobile, vertical stack on desktop */}
        {(() => {
          const slides = product.images?.length ? product.images.map((_, i) => i) : [0, 3, 6];
          return (
            <div className="relative min-w-0">
              <div
                ref={galleryRef}
                onScroll={(e) => {
                  const el = e.currentTarget;
                  const idx = Math.round(el.scrollLeft / el.offsetWidth);
                  setSlideIndex(idx);
                }}
                className="flex overflow-x-auto snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:block lg:overflow-visible"
              >
                {slides.map((idx, n) => (
                  <div
                    key={n}
                    className="aspect-[3/4] w-full shrink-0 snap-center overflow-hidden bg-[var(--color-tile)] lg:w-auto"
                  >
                    <ProductImage item={product} index={idx} className="h-full w-full" />
                  </div>
                ))}
              </div>
              {/* Dot indicators — mobile only */}
              {slides.length > 1 && (
                <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5 lg:hidden">
                  {slides.map((_, n) => (
                    <button
                      key={n}
                      onClick={() => galleryRef.current?.scrollTo({ left: n * galleryRef.current.offsetWidth, behavior: "smooth" })}
                      className={`h-1.5 rounded-full transition-all duration-300 ${n === slideIndex ? "w-5 bg-white" : "w-1.5 bg-white/50"}`}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })()}

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

            <div className="mt-3 flex items-start justify-between gap-4">
              <h1 className="font-serif text-3xl">{product.name}</h1>
              <button
                onClick={() => { if (!user) { setLoginOpen(true); return; } toggleWishlist(product.id); }}
                aria-label={inWishlist(product.id) ? "Remove from wishlist" : "Save to wishlist"}
                className="mt-1 shrink-0 transition-colors"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill={inWishlist(product.id) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.4" className={inWishlist(product.id) ? "text-ink" : "text-ink-soft hover:text-ink"}>
                  <path d="M6 3h12a1 1 0 011 1v17l-7-4-7 4V4a1 1 0 011-1z" />
                </svg>
              </button>
            </div>
            <p className="mt-2 font-serif text-lg">{vnd(product.price)}</p>
            <p className="mt-5 max-w-md text-sm leading-relaxed text-ink-soft">{product.blurb}</p>

            {/* size */}
            {product && (
              <div className="mt-7">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-ink-soft">Size</p>
                  <button
                    onClick={() => setSizeGuideOpen(true)}
                    className="text-[11px] tracking-[0.1em] uppercase underline underline-offset-2 text-ink-soft hover:text-ink transition-colors"
                  >
                    Size Guide
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {product.sizes.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSize(s)}
                      className={`min-w-11 rounded border px-3 py-2 text-sm transition-colors ${
                        size === s ? "border-ink bg-ink text-white" : "edge hover:border-ink"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>

                {selectedMeasurements && (
                  <div className="mt-3 flex gap-4 rounded-lg bg-[var(--color-tile)] px-4 py-3 text-xs text-ink-soft">
                    <span>Bust <b className="text-ink">{selectedMeasurements.bust_min}–{selectedMeasurements.bust_max}</b></span>
                    <span>Waist <b className="text-ink">{selectedMeasurements.waist_min}–{selectedMeasurements.waist_max}</b></span>
                    <span>Hips <b className="text-ink">{selectedMeasurements.hip_min}–{selectedMeasurements.hip_max}</b></span>
                    <span className="ml-auto text-[10px] text-ink-soft/60">cm</span>
                  </div>
                )}
              </div>
            )}

            {/* actions */}
            <button
              onClick={handleAdd}
              className="mt-8 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-ink text-white transition-opacity hover:opacity-85"
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
