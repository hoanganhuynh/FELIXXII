import { Link } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { resolveImageUrl, type Product } from "../data/catalog";
import { useProducts } from "../store/products";
import ProductCard from "../components/ProductCard";
import { supabase } from "../lib/supabase";

interface HeroBanner {
  id: string;
  image_url: string;
  collection_tag: string;
  heading: string;
  subheading: string;
}

const FALLBACK_BANNERS: HeroBanner[] = [
  {
    id: "f1", image_url: "/hero-banner/592347093_1190008066643058_5631399014138437439_n.jpg",
    collection_tag: "FW 2025", heading: "Lụa Đêm",
    subheading: "",
  },
];

function HeroCarousel() {
  const [banners, setBanners] = useState<HeroBanner[]>(FALLBACK_BANNERS);
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    supabase
      .from("hero_banners")
      .select("id, image_url, collection_tag, heading, subheading")
      .eq("active", true)
      .order("sort_order")
      .then(({ data }) => { if (data?.length) setBanners(data as HeroBanner[]); });
  }, []);

  useEffect(() => {
    if (banners.length <= 1 || paused) return;
    const timer = setInterval(() => setIdx((i) => (i + 1) % banners.length), 5000);
    return () => clearInterval(timer);
  }, [banners.length, paused]);

  const go = (dir: -1 | 1) => {
    setIdx((i) => (i + dir + banners.length) % banners.length);
    setPaused(true);
    setTimeout(() => setPaused(false), 8000);
  };
  const goTo = (i: number) => { setIdx(i); setPaused(true); setTimeout(() => setPaused(false), 8000); };

  return (
    <section
      className="relative aspect-[3/4] md:aspect-video w-full overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {banners.map((b, i) => (
        <div
          key={b.id}
          aria-hidden={i !== idx}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            i === idx ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          <img
            src={b.image_url}
            alt={b.heading}
            className="absolute inset-0 h-full w-full object-cover object-[center_20%]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

          {/* Centered bottom text block — Figma ref */}
          <div className="absolute inset-x-0 bottom-0 flex flex-col items-center px-5 pb-10 text-center text-white md:pb-12">
            <h1 className="font-serif text-[2.15rem] leading-[1.08] drop-shadow-sm md:text-5xl lg:text-6xl">
              {b.heading}
            </h1>

            <div className="mt-5 flex items-center gap-3 md:mt-6 md:gap-4">
              <Link
                to="/shop"
                className="inline-flex h-11 min-w-[132px] items-center justify-center rounded-full bg-white px-6 text-[13px] font-medium text-black transition-opacity hover:opacity-90 md:h-[52px] md:min-w-[170px] md:px-8 md:text-[16px]"
              >
                SHOP ALL
              </Link>
              <Link
                to="/proposal"
                className="inline-flex h-11 min-w-[124px] items-center justify-center rounded-full border border-white px-6 text-[13px] text-white transition-colors hover:bg-white/10 md:h-[52px] md:min-w-[150px] md:px-8 md:text-[16px]"
              >
                Proposal
              </Link>
            </div>

            {/* Slide indicators (line style) */}
            {banners.length > 1 && (
              <div className="mt-6 flex items-center gap-4">
                {banners.map((_, j) => (
                  <button
                    key={j}
                    onClick={() => goTo(j)}
                    aria-label={`Slide ${j + 1}`}
                    className={`h-px w-16 transition-all duration-300 ${
                      j === idx ? "bg-white" : "bg-white/35"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      ))}

      {/* Prev / Next */}
      {banners.length > 1 && (
        <>
          <button onClick={() => go(-1)} aria-label="Previous" className="absolute left-4 top-1/2 -translate-y-1/2 p-2 text-white/60 transition-colors hover:text-white">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <button onClick={() => go(1)} aria-label="Next" className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-white/60 transition-colors hover:text-white">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 18l6-6-6-6" /></svg>
          </button>
        </>
      )}
    </section>
  );
}

interface Promotion {
  id: string;
  image_url: string;
  link_url: string;
  title: string;
}

function PromoImage({ p, className }: { p: Promotion; className: string }) {
  const target = p.link_url.trim() || `/khuyen-mai/${p.id}`;
  const img = <img src={p.image_url} alt={p.title || "Banner khuyến mãi"} className={className} />;
  if (/^https?:\/\//i.test(target)) {
    return <a href={target} target="_blank" rel="noreferrer">{img}</a>;
  }
  return <Link to={target}>{img}</Link>;
}

function PromotionCarousel({ promos }: { promos: Promotion[] }) {
  const [idx, setIdx] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);

  const goTo = (i: number) => {
    trackRef.current?.scrollTo({ left: i * trackRef.current.offsetWidth, behavior: "smooth" });
  };

  return (
    <div className="relative">
      <div
        ref={trackRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          setIdx(Math.round(el.scrollLeft / el.offsetWidth));
        }}
        className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {promos.map((p) => (
          <div key={p.id} className="w-full shrink-0 snap-center">
            <PromoImage p={p} className="h-auto w-full object-cover" />
          </div>
        ))}
      </div>
      <div className="mt-4 flex justify-center gap-1.5">
        {promos.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            aria-label={`Slide ${i + 1}`}
            className={`h-1.5 rounded-full transition-all duration-300 ${i === idx ? "w-5 bg-ink" : "w-1.5 bg-ink/25"}`}
          />
        ))}
      </div>
    </div>
  );
}

function PromotionSection() {
  const [promos, setPromos] = useState<Promotion[]>([]);

  useEffect(() => {
    supabase
      .from("promotions")
      .select("id, image_url, link_url, title")
      .eq("active", true)
      .order("sort_order")
      .then(({ data }) => { if (data?.length) setPromos(data as Promotion[]); });
  }, []);

  if (!promos.length) return null;

  return (
    <section className="px-0 py-10 md:px-8 lg:px-10">
      {promos.length === 1 && <PromoImage p={promos[0]} className="h-auto w-full object-cover" />}
      {promos.length === 2 && (
        <div className="grid grid-cols-2 gap-4 md:gap-6">
          {promos.map((p) => (
            <PromoImage key={p.id} p={p} className="aspect-[3/4] h-full w-full object-cover" />
          ))}
        </div>
      )}
      {promos.length > 2 && <PromotionCarousel promos={promos} />}
    </section>
  );
}

function newArrivalImage(product: Product, mode: "product" | "model") {
  const fallback = product.images?.[0] ?? "";
  if (mode === "product") return product.productImage ?? fallback;
  return product.modelImage ?? product.images?.[1] ?? fallback;
}

export default function Home() {
  const products = useProducts((s) => s.products);
  const loaded = useProducts((s) => s.loaded);
  const [newArrivalView, setNewArrivalView] = useState<"product" | "model">("model");
  const [newArrivalPage, setNewArrivalPage] = useState(0);

  const sorted = [...products].sort((a, b) => (a.bestseller ?? 99) - (b.bestseller ?? 99));
  const newArrivalPool = [...products].sort((a, b) => {
    const rankA = a.newArrivalRank ?? Number.POSITIVE_INFINITY;
    const rankB = b.newArrivalRank ?? Number.POSITIVE_INFINITY;
    if (rankA !== rankB) return rankA - rankB;
    const weeklyA = a.weeklyUnitsSold ?? 0;
    const weeklyB = b.weeklyUnitsSold ?? 0;
    if (weeklyA !== weeklyB) return weeklyB - weeklyA;
    return b.createdAt - a.createdAt;
  });
  const featured: Product[] = [];
  const featuredStyleIds = new Set<string>();
  for (const product of newArrivalPool) {
    if (featuredStyleIds.has(product.styleId)) continue;
    featured.push(product);
    featuredStyleIds.add(product.styleId);
    if (featured.length === 6) break;
  }
  const top20 = sorted.slice(0, 4);
  const newArrivalPageSize = 3;
  const newArrivalPages = Math.max(1, Math.ceil(featured.length / newArrivalPageSize));
  const visibleNewArrivals = featured.slice(
    newArrivalPage * newArrivalPageSize,
    newArrivalPage * newArrivalPageSize + newArrivalPageSize
  );

  useEffect(() => {
    if (newArrivalPage >= newArrivalPages) setNewArrivalPage(Math.max(0, newArrivalPages - 1));
  }, [newArrivalPage, newArrivalPages]);

  return (
    <div className="pt-[62px]">

      {/* ══ HERO ══════════════════════════════════════════════════════ */}
      <HeroCarousel />

      {/* ══ NEW ARRIVAL ═══════════════════════════════════════════════ */}
      <section className="px-6 py-10 md:px-8 lg:px-10">
        {/* Section header */}
        <div className="mb-6 flex items-end justify-between">
          <div>
            <p className="text-[11px] tracking-[0.18em] uppercase text-ink-soft">Best week</p>
            <h2 className="mt-0.5 font-serif text-3xl md:text-4xl">New Arrival</h2>
          </div>
          <Link to="/shop" className="hidden items-center gap-1 text-[12px] tracking-[0.1em] uppercase text-ink-soft transition-colors hover:text-ink md:flex">
            More <span aria-hidden>→</span>
          </Link>
        </div>

        {!loaded && <p className="py-8 text-center text-xs text-ink-soft">Đang tải sản phẩm…</p>}
        {loaded && !featured.length && <p className="py-8 text-center text-xs text-ink-soft">Chưa có sản phẩm.</p>}

        <div className="no-scrollbar -mr-6 flex snap-x gap-4 overflow-x-auto pb-2 md:hidden">
          {featured.map((p) => (
            <div key={p.id} className="w-[90%] shrink-0 snap-start">
              <ProductCard item={p} imageMode={newArrivalView} />
            </div>
          ))}
        </div>

        <div className="hidden gap-6 md:grid md:grid-cols-3">
          {visibleNewArrivals.map((p) => (
            <div key={p.id}>
              <ProductCard item={p} imageMode={newArrivalView} />
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-col items-center gap-7">
          {featured.length > newArrivalPageSize && (
            <div className="hidden items-end gap-3 md:flex">
              {featured.map((p, i) => {
                const page = Math.floor(i / newArrivalPageSize);
                const active = page === newArrivalPage;
                return (
                  <button
                    key={p.id}
                    onClick={() => setNewArrivalPage(page)}
                    aria-label={`Show New Arrival page ${page + 1}`}
                    className={`overflow-hidden rounded-sm transition-opacity duration-200 ${
                      active ? "opacity-100" : "opacity-70 hover:opacity-90"
                    }`}
                    style={{ width: 56, height: 74 }}
                  >
                    <img
                      src={resolveImageUrl(newArrivalImage(p, newArrivalView))}
                      alt=""
                      className="h-full w-full object-cover object-top"
                    />
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={() => setNewArrivalView("product")}
              className={`text-[11px] uppercase tracking-[0.15em] transition-colors ${
                newArrivalView === "product" ? "text-ink" : "text-ink-soft"
              }`}
            >
              Product View
            </button>
            <button
              onClick={() => setNewArrivalView((view) => view === "model" ? "product" : "model")}
              className="flex h-4 w-8 items-center rounded-full border border-ink/30 px-0.5 transition-colors"
              aria-label="Toggle New Arrival image view"
            >
              <span
                className={`h-3 w-3 rounded-full bg-ink transition-transform duration-200 ${
                  newArrivalView === "model" ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
            <button
              onClick={() => setNewArrivalView("model")}
              className={`text-[11px] uppercase tracking-[0.15em] transition-colors ${
                newArrivalView === "model" ? "text-ink" : "text-ink-soft"
              }`}
            >
              Model View
            </button>
          </div>
          <Link to="/shop" className="flex items-center gap-1 text-[12px] uppercase tracking-[0.1em] text-ink-soft transition-colors hover:text-ink md:hidden">
            More <span aria-hidden>→</span>
          </Link>
        </div>
      </section>

      {/* ══ PROMOTION BANNER ══════════════════════════════════════════ */}
      <PromotionSection />

      {/* ══ THIS WEEK TOP 20 ══════════════════════════════════════════ */}
      <section className="px-6 py-10 md:px-8 lg:px-10">
        {/* Section header */}
        <div className="mb-6 flex items-end justify-between">
          <div>
            <p className="text-[11px] tracking-[0.18em] uppercase text-ink-soft">Best week</p>
            <h2 className="mt-0.5 font-serif text-3xl md:text-4xl">This week top 20</h2>
          </div>
          <Link to="/shop" className="hidden items-center gap-1 text-[12px] tracking-[0.1em] uppercase text-ink-soft transition-colors hover:text-ink md:flex">
            More <span aria-hidden>→</span>
          </Link>
        </div>

        {/* Ranked grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {top20.map((p) => (
            <ProductCard key={p.id} item={p} />
          ))}
        </div>
        <div className="mt-8 flex justify-center md:hidden">
          <Link to="/shop" className="flex items-center gap-1 text-[12px] uppercase tracking-[0.1em] text-ink-soft transition-colors hover:text-ink">
            More <span aria-hidden>→</span>
          </Link>
        </div>
      </section>

    </div>
  );
}
