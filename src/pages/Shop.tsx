import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  SHOP_CATEGORIES,
  categoryLabel,
  collectionLabel,
  type CategoryId,
  type CollectionId,
} from "../data/catalog";
import { useProducts } from "../store/products";
import ProductCard from "../components/ProductCard";
import { useReveal } from "../hooks/useReveal";

const SIZES = ["S", "M", "L", "XL"];
const SORTS = [
  { id: "new", label: "Newest" },
  { id: "best", label: "Bestseller" },
  { id: "asc", label: "Price: Low to High" },
  { id: "desc", label: "Price: High to Low" },
] as const;
type SortId = (typeof SORTS)[number]["id"];

const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
const vnd = (n: number) => `${n.toLocaleString("vi-VN")}đ`;

export default function Shop() {
  const products = useProducts((s) => s.products);
  const loaded = useProducts((s) => s.loaded);
  const reveal = useReveal<HTMLDivElement>();
  const [params, setParams] = useSearchParams();
  const cat = params.get("cat") as CategoryId | null;
  const collection = params.get("collection") as CollectionId | null;

  const [sizes, setSizes] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number] | null>(null);
  const [sort, setSort] = useState<SortId>("new");
  const [mobileOpen, setMobileOpen] = useState(false);
  const priceBounds = useMemo<[number, number]>(() => {
    if (!products.length) return [0, 0];
    const values = products.map((p) => p.price);
    return [Math.min(...values), Math.max(...values)];
  }, [products]);
  const [minPrice, maxPrice] = priceBounds;
  const selectedPriceRange = priceRange ?? priceBounds;
  const hasCustomPriceRange = priceRange !== null && (priceRange[0] !== minPrice || priceRange[1] !== maxPrice);

  useEffect(() => {
    if (!priceRange) return;
    const nextMin = Math.max(minPrice, Math.min(priceRange[0], maxPrice));
    const nextMax = Math.max(nextMin, Math.min(priceRange[1], maxPrice));
    if (nextMin !== priceRange[0] || nextMax !== priceRange[1]) setPriceRange([nextMin, nextMax]);
  }, [maxPrice, minPrice, priceRange]);

  const list = useMemo(() => {
    let pool = products;
    if (cat) pool = pool.filter((p) => p.category === cat);
    if (collection) pool = pool.filter((p) => p.collection === collection);

    // faceted (each facet AND; values within a facet OR)
    pool = pool.filter((p) => {
      if (hasCustomPriceRange && (p.price < selectedPriceRange[0] || p.price > selectedPriceRange[1])) return false;
      if (sizes.length && !sizes.some((s) => p.sizes.includes(s))) return false;
      return true;
    });

    const arr = [...pool];
    arr.sort((a, b) => {
      if (sort === "asc") return a.price - b.price;
      if (sort === "desc") return b.price - a.price;
      if (sort === "best") return (a.bestseller || 99) - (b.bestseller || 99);
      // new
      return b.createdAt - a.createdAt;
    });
    return arr;
  }, [products, cat, collection, sizes, hasCustomPriceRange, selectedPriceRange, sort]);

  const activeCount = sizes.length + (hasCustomPriceRange ? 1 : 0);
  const clearAll = () => {
    setSizes([]); setPriceRange(null);
  };

  const heading = collection ? collectionLabel(collection) : cat ? categoryLabel(cat) : "All Products";
  const kicker = collection ? "Collection" : "Category";

  return (
    <div ref={reveal} className="pt-[62px]">
      <header className="border-b edge px-5 pb-6 pt-10 md:px-8">
        <div className="mx-auto max-w-[1800px]">
          <p className="label text-ink-soft">{kicker}</p>
          <div className="mt-1 flex flex-wrap items-end justify-between gap-4">
            <h1 className="font-serif text-3xl md:text-4xl">{heading}</h1>
            <div className="flex items-center gap-4">
              <span className="text-xs text-ink-soft">{list.length} products</span>
              <label className="flex items-center gap-2 text-xs">
                <span className="text-ink-soft">Sort</span>
                <select value={sort} onChange={(e) => setSort(e.target.value as SortId)} className="border-b edge bg-transparent py-1 focus:outline-none">
                  {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </label>
              <button onClick={() => setMobileOpen((v) => !v)} className="flex items-center gap-1.5 text-xs lg:hidden">
                Filters {activeCount > 0 && <span className="rounded-full bg-ink px-1.5 text-white">{activeCount}</span>}
              </button>
            </div>
          </div>
          {/* category quick switch */}
          <div className="no-scrollbar mt-5 flex gap-5 overflow-x-auto">
            <QuickCat active={!cat && !collection} onClick={() => setParams({})} label="All" />
            {SHOP_CATEGORIES.map((c) => (
              <QuickCat key={c.id} active={cat === c.id} onClick={() => setParams({ cat: c.id })} label={c.label} />
            ))}
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1800px] gap-8 px-5 py-8 md:px-8 lg:grid-cols-[320px_1fr]">
        {/* ---- FACETED FILTER RAIL ---- */}
        <aside className={`${mobileOpen ? "block" : "hidden"} lg:block lg:sticky lg:top-[78px] lg:h-fit`}>
          <div className="flex items-center justify-between border-b edge pb-6">
            <span className="text-2xl">Filters</span>
            {activeCount > 0 && (
              <button onClick={clearAll} className="text-xs text-ink-soft underline underline-offset-2">Clear all ({activeCount})</button>
            )}
          </div>

          <Facet title="Size">
            <SizeRow active={sizes} onToggle={(v) => setSizes((s) => toggle(s, v))} />
          </Facet>

          <Facet title="Price Range">
            <PriceRange bounds={priceBounds} value={selectedPriceRange} onChange={setPriceRange} />
          </Facet>
        </aside>

        {/* ---- GRID ---- */}
        <section>
          {!loaded ? (
            <p className="py-24 text-center text-xs text-ink-soft">Đang tải sản phẩm…</p>
          ) : list.length === 0 ? (
            <div className="py-24 text-center">
              <p className="font-serif text-2xl">No products match the selected filters.</p>
              <button onClick={clearAll} className="link-underline mt-4 text-sm">Clear filters</button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 md:gap-x-6">
              {list.map((p, i) => (
                <div key={p.id} className="reveal" style={{ transitionDelay: `${(i % 3) * 60}ms` }}>
                  <ProductCard item={p} index={i} />
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function QuickCat({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} className={`nav-link whitespace-nowrap border-b-2 pb-2 ${active ? "border-ink font-medium" : "border-transparent text-ink-soft"}`}>
      {label}
    </button>
  );
}

function Facet({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b edge py-8">
      <p className="mb-6 text-xl font-semibold">{title}</p>
      {children}
    </div>
  );
}

function SizeRow({ active, onToggle }: {
  active: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-4">
      {SIZES.map((size) => {
        const on = active.includes(size);
        return (
          <button
            key={size}
            aria-pressed={on}
            onClick={() => onToggle(size)}
            className={`flex h-12 min-w-16 items-center justify-center rounded-full border px-5 text-xl transition-colors ${
              on ? "border-ink bg-ink text-white" : "edge text-ink-soft hover:border-ink"
            }`}
          >
            {size}
          </button>
        );
      })}
    </div>
  );
}

function PriceRange({ bounds, value, onChange }: {
  bounds: [number, number];
  value: [number, number];
  onChange: (v: [number, number]) => void;
}) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [min, max] = bounds;
  const [lo, hi] = value;
  const disabled = min === max;
  const step = Math.max(50_000, Math.round((max - min) / 100 / 10_000) * 10_000);
  const span = Math.max(1, max - min);
  const leftPct = ((lo - min) / span) * 100;
  const rightPct = ((hi - min) / span) * 100;

  const clampToStep = (next: number) => {
    const stepped = Math.round((next - min) / step) * step + min;
    return Math.max(min, Math.min(max, stepped));
  };
  const valueFromPointer = (clientX: number) => {
    const track = trackRef.current;
    if (!track) return min;
    const rect = track.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return clampToStep(min + ratio * span);
  };
  const setLow = (next: number) => onChange([Math.min(clampToStep(next), hi), hi]);
  const setHigh = (next: number) => onChange([lo, Math.max(clampToStep(next), lo)]);
  const startDrag = (handle: "low" | "high") => (event: React.PointerEvent<HTMLButtonElement>) => {
    if (disabled) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const next = valueFromPointer(event.clientX);
    if (handle === "low") setLow(next);
    else setHigh(next);
  };
  const drag = (handle: "low" | "high") => (event: React.PointerEvent<HTMLButtonElement>) => {
    if (disabled || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const next = valueFromPointer(event.clientX);
    if (handle === "low") setLow(next);
    else setHigh(next);
  };

  return (
    <div>
      <div className="mb-6">
        <div ref={trackRef} className="relative h-8 touch-none">
          <div className="absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 bg-[var(--color-line)]" />
          <div
            className="absolute top-1/2 h-1 -translate-y-1/2 bg-ink"
            style={{ left: `${leftPct}%`, width: `${rightPct - leftPct}%` }}
          />
          <button
            type="button"
            disabled={disabled}
            aria-label="Minimum price"
            onPointerDown={startDrag("low")}
            onPointerMove={drag("low")}
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft" || e.key === "ArrowDown") setLow(lo - step);
              if (e.key === "ArrowRight" || e.key === "ArrowUp") setLow(lo + step);
            }}
            className="absolute top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink focus:outline-none focus:ring-2 focus:ring-ink/30 disabled:cursor-default"
            style={{ left: `${leftPct}%` }}
          />
          <button
            type="button"
            disabled={disabled}
            aria-label="Maximum price"
            onPointerDown={startDrag("high")}
            onPointerMove={drag("high")}
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft" || e.key === "ArrowDown") setHigh(hi - step);
              if (e.key === "ArrowRight" || e.key === "ArrowUp") setHigh(hi + step);
            }}
            className="absolute top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink focus:outline-none focus:ring-2 focus:ring-ink/30 disabled:cursor-default"
            style={{ left: `${rightPct}%` }}
          />
        </div>
        <div className="mt-3 flex justify-between text-xl tabular-nums">
          <span>{vnd(lo)}</span>
          <span>{vnd(hi)}</span>
        </div>
      </div>
    </div>
  );
}
