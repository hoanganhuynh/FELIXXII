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
import { useCampaigns } from "../store/campaigns";
import ProductCard from "../components/ProductCard";
import { useReveal } from "../hooks/useReveal";
import { computeProductPricing } from "../lib/discount";

const SIZES = ["S", "M", "L", "XL"];
const SORTS = [
  { id: "new", label: "Newest" },
  { id: "best", label: "Bestseller" },
  { id: "asc", label: "Price: Low to High" },
  { id: "desc", label: "Price: High to Low" },
] as const;
const PRICE_PRESETS = [
  { id: "under-2m", label: "<2.000.000", min: 0, max: 2_000_000 },
  { id: "2m-5m", label: "2.000.000 - 5.000.000", min: 2_000_000, max: 5_000_000 },
  { id: "over-5m", label: ">5.000.000", min: 5_000_000, max: Number.POSITIVE_INFINITY },
] as const;
type SortId = (typeof SORTS)[number]["id"];

const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
const vnd = (n: number) => `${n.toLocaleString("vi-VN")}đ`;

export default function Shop() {
  const products = useProducts((s) => s.products);
  const loaded = useProducts((s) => s.loaded);
  const campaigns = useCampaigns((s) => s.campaigns);
  const fetchCampaigns = useCampaigns((s) => s.fetch);
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
    const values = products.map((p) => computeProductPricing(p, campaigns).price);
    return [Math.min(...values), Math.max(...values)];
  }, [campaigns, products]);
  const [minPrice, maxPrice] = priceBounds;
  const selectedPriceRange = priceRange ?? priceBounds;
  const hasCustomPriceRange = priceRange !== null && (priceRange[0] !== minPrice || priceRange[1] !== maxPrice);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

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
      const price = computeProductPricing(p, campaigns).price;
      if (hasCustomPriceRange && (price < selectedPriceRange[0] || price > selectedPriceRange[1])) return false;
      if (sizes.length && !sizes.some((s) => p.sizes.includes(s))) return false;
      return true;
    });

    const arr = [...pool];
    arr.sort((a, b) => {
      if (sort === "asc") return computeProductPricing(a, campaigns).price - computeProductPricing(b, campaigns).price;
      if (sort === "desc") return computeProductPricing(b, campaigns).price - computeProductPricing(a, campaigns).price;
      if (sort === "best") return (a.bestseller || 99) - (b.bestseller || 99);
      // new
      return b.createdAt - a.createdAt;
    });
    return arr;
  }, [products, cat, collection, sizes, hasCustomPriceRange, selectedPriceRange, sort, campaigns]);

  const activeCount = sizes.length + (hasCustomPriceRange ? 1 : 0);
  const clearAll = () => {
    setSizes([]); setPriceRange(null);
  };

  const heading = collection ? collectionLabel(collection) : cat ? categoryLabel(cat) : "All Products";
  const kicker = collection ? "Collection" : "Category";

  return (
    <div ref={reveal} className="pt-[62px]">
      <header className="border-b edge px-5 pb-6 pt-10 md:px-8">
        <div className="mx-auto max-w-[1800px] lg:pl-8">
          <p className="label text-ink-soft">{kicker}</p>
          <div className="mt-1 flex flex-wrap items-end justify-between gap-4">
            <h1 className="font-serif text-3xl md:text-4xl">
              {heading}<span className="md:hidden"> ({list.length})</span>
            </h1>
            <div className="flex w-full items-center justify-between gap-4 md:w-auto md:justify-end">
              <span className="hidden text-xs text-ink-soft md:inline">{list.length} products</span>
              <label className="flex min-w-0 items-center gap-2 text-xs">
                <span className="text-ink-soft">Sort</span>
                <select value={sort} onChange={(e) => setSort(e.target.value as SortId)} className="min-w-[128px] border-b edge bg-transparent py-1 text-left focus:outline-none">
                  {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </label>
              <button onClick={() => setMobileOpen((v) => !v)} className="ml-auto flex items-center gap-1.5 text-xs lg:hidden">
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
          <div className="flex items-center justify-between border-b edge pb-4">
            <span className="text-lg">Filters</span>
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
                <div key={p.id}>
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
    <div className="border-b edge py-6">
      <p className="mb-4 text-base font-medium">{title}</p>
      {children}
    </div>
  );
}

function SizeRow({ active, onToggle }: {
  active: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-3">
      {SIZES.map((size) => {
        const on = active.includes(size);
        return (
          <button
            key={size}
            aria-pressed={on}
            onClick={() => onToggle(size)}
            className={`flex h-10 min-w-14 items-center justify-center rounded-full border px-4 text-base transition-colors ${
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

  if (disabled) {
    return (
      <div className="mb-6">
        <div className="relative h-8">
          <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-[var(--color-line)]" />
          <span className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink" />
        </div>
        <p className="mt-3 text-center text-sm tabular-nums text-ink-soft">{vnd(lo)}</p>
      </div>
    );
  }

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
  const setPreset = (preset: (typeof PRICE_PRESETS)[number]) => {
    const nextMin = Math.max(min, preset.min);
    const nextMax = Math.min(max, preset.max);
    onChange([Math.min(nextMin, nextMax), Math.max(nextMin, nextMax)]);
  };
  const isPresetActive = (preset: (typeof PRICE_PRESETS)[number]) => {
    const nextMin = Math.max(min, preset.min);
    const nextMax = Math.min(max, preset.max);
    return lo === Math.min(nextMin, nextMax) && hi === Math.max(nextMin, nextMax);
  };
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
          <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-[var(--color-line)]" />
          <div
            className="absolute top-1/2 h-px -translate-y-1/2 bg-ink"
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
            className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink focus:outline-none focus:ring-2 focus:ring-ink/30"
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
            className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink focus:outline-none focus:ring-2 focus:ring-ink/30"
            style={{ left: `${rightPct}%` }}
          />
        </div>
        <div className="mt-3 flex justify-between text-sm tabular-nums">
          <span>{vnd(lo)}</span>
          <span>{vnd(hi)}</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        {PRICE_PRESETS.map((preset) => {
          const active = isPresetActive(preset);
          return (
            <button
              key={preset.id}
              type="button"
              aria-pressed={active}
              onClick={() => setPreset(preset)}
              className={`flex h-10 items-center justify-center rounded-full border px-4 text-sm transition-colors ${
                active ? "border-ink bg-ink text-white" : "edge text-ink-soft hover:border-ink"
              }`}
            >
              {preset.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
