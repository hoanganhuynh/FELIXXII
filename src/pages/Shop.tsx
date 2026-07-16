import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  products,
  accessories,
  PALETTE,
  SILHOUETTES,
  OCCASIONS,
  CATEGORIES,
  categoryLabel,
  collectionLabel,
  type CategoryId,
  type CollectionId,
  type Silhouette,
  type Occasion,
} from "../data/catalog";
import ProductCard from "../components/ProductCard";
import { useReveal } from "../hooks/useReveal";

const SIZES = ["S", "M", "L", "XL", "Custom"];
const PRICE_BUCKETS = [
  { id: "u2", label: "Under 2 mil", test: (p: number) => p < 2_000_000 },
  { id: "2-4", label: "2 – 4 mil", test: (p: number) => p >= 2_000_000 && p < 4_000_000 },
  { id: "4-6", label: "4 – 6 mil", test: (p: number) => p >= 4_000_000 && p < 6_000_000 },
  { id: "o6", label: "Over 6 mil", test: (p: number) => p >= 6_000_000 },
];
const SORTS = [
  { id: "new", label: "Newest" },
  { id: "best", label: "Bestseller" },
  { id: "asc", label: "Price: Low to High" },
  { id: "desc", label: "Price: High to Low" },
] as const;
type SortId = (typeof SORTS)[number]["id"];

const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

export default function Shop() {
  const reveal = useReveal<HTMLDivElement>();
  const [params, setParams] = useSearchParams();
  const cat = params.get("cat") as CategoryId | null;
  const collection = params.get("collection") as CollectionId | null;

  const [colors, setColors] = useState<string[]>([]);
  const [sizes, setSizes] = useState<string[]>([]);
  const [sils, setSils] = useState<Silhouette[]>([]);
  const [occs, setOccs] = useState<Occasion[]>([]);
  const [prices, setPrices] = useState<string[]>([]);
  const [sort, setSort] = useState<SortId>("new");
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAccessoryView = cat === "phu-kien";

  const list = useMemo(() => {
    let pool: (typeof products[number] | typeof accessories[number])[] = isAccessoryView ? accessories : products;
    if (cat && !isAccessoryView) pool = (pool as typeof products).filter((p) => p.category === cat);
    if (collection) pool = pool.filter((p) => p.collection === collection);

    // faceted (each facet AND; values within a facet OR)
    pool = pool.filter((p) => {
      if (colors.length && !p.colors.some((c) => colors.includes(c.name))) return false;
      if (prices.length && !prices.some((id) => PRICE_BUCKETS.find((b) => b.id === id)!.test(p.price))) return false;
      if (!("type" in p)) {
        if (sizes.length && !sizes.some((s) => p.sizes.includes(s))) return false;
        if (sils.length && (!p.silhouette || !sils.includes(p.silhouette))) return false;
        if (occs.length && !occs.includes(p.occasion)) return false;
      }
      return true;
    });

    const arr = [...pool];
    arr.sort((a, b) => {
      if (sort === "asc") return a.price - b.price;
      if (sort === "desc") return b.price - a.price;
      if (sort === "best") return (("bestseller" in a && a.bestseller) || 99) - (("bestseller" in b && b.bestseller) || 99);
      // new
      return (("createdAt" in b && b.createdAt) || 0) - (("createdAt" in a && a.createdAt) || 0);
    });
    return arr;
  }, [cat, collection, colors, sizes, sils, occs, prices, sort, isAccessoryView]);

  const activeCount = colors.length + sizes.length + sils.length + occs.length + prices.length;
  const clearAll = () => {
    setColors([]); setSizes([]); setSils([]); setOccs([]); setPrices([]);
  };

  const heading = collection ? collectionLabel(collection) : cat ? categoryLabel(cat) : "All Products";
  const kicker = collection ? "Collection" : "Category";

  return (
    <div ref={reveal} className="pt-[62px]">
      <header className="border-b edge px-5 pb-6 pt-10 md:px-8">
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
          {CATEGORIES.map((c) => (
            <QuickCat key={c.id} active={cat === c.id} onClick={() => setParams({ cat: c.id })} label={c.label} />
          ))}
        </div>
      </header>

      <div className="mx-auto grid max-w-[1800px] gap-8 px-5 py-8 md:px-8 lg:grid-cols-[240px_1fr]">
        {/* ---- FACETED FILTER RAIL ---- */}
        <aside className={`${mobileOpen ? "block" : "hidden"} lg:block lg:sticky lg:top-[78px] lg:h-fit`}>
          <div className="flex items-center justify-between border-b edge pb-3">
            <span className="text-sm">Filters</span>
            {activeCount > 0 && (
              <button onClick={clearAll} className="text-xs text-ink-soft underline underline-offset-2">Clear all ({activeCount})</button>
            )}
          </div>

          {/* colour swatches */}
          <Facet title="Colors">
            <div className="flex flex-wrap gap-2.5">
              {Object.values(PALETTE).map((c) => {
                const on = colors.includes(c.name);
                return (
                  <button
                    key={c.name}
                    title={c.name}
                    aria-pressed={on}
                    onClick={() => setColors((s) => toggle(s, c.name))}
                    className={`h-7 w-7 rounded-full ring-1 transition-transform ${on ? "ring-2 ring-ink scale-110" : "ring-black/10"}`}
                    style={{ background: c.hex }}
                  />
                );
              })}
            </div>
          </Facet>

          {!isAccessoryView && (
            <>
              <Facet title="Size">
                <ChipRow options={SIZES} active={sizes} onToggle={(v) => setSizes((s) => toggle(s, v))} />
              </Facet>
              <Facet title="Silhouette">
                <ChipRow options={SILHOUETTES.map((s) => s.id)} labels={Object.fromEntries(SILHOUETTES.map((s) => [s.id, s.label]))} active={sils} onToggle={(v) => setSils((s) => toggle(s, v as Silhouette))} />
              </Facet>
              <Facet title="Occasion">
                <ChipRow options={OCCASIONS.map((o) => o.id)} labels={Object.fromEntries(OCCASIONS.map((o) => [o.id, o.label]))} active={occs} onToggle={(v) => setOccs((s) => toggle(s, v as Occasion))} />
              </Facet>
            </>
          )}

          <Facet title="Price Range">
            <ChipRow options={PRICE_BUCKETS.map((b) => b.id)} labels={Object.fromEntries(PRICE_BUCKETS.map((b) => [b.id, b.label]))} active={prices} onToggle={(v) => setPrices((s) => toggle(s, v))} />
          </Facet>
        </aside>

        {/* ---- GRID ---- */}
        <section>
          {list.length === 0 ? (
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
    <div className="border-b edge py-4">
      <p className="mb-3 text-xs font-medium">{title}</p>
      {children}
    </div>
  );
}

function ChipRow({
  options,
  labels,
  active,
  onToggle,
}: {
  options: string[];
  labels?: Record<string, string>;
  active: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = active.includes(o);
        return (
          <button
            key={o}
            aria-pressed={on}
            onClick={() => onToggle(o)}
            className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${on ? "border-ink bg-ink text-white" : "edge text-ink-soft hover:border-ink"}`}
          >
            {labels?.[o] ?? o}
          </button>
        );
      })}
    </div>
  );
}
