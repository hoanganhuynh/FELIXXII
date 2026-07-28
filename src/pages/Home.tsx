import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { products, IMG_BASE, type Product } from "../data/catalog";
import { vnd } from "../components/ProductCard";
import { supabase } from "../lib/supabase";

interface HeroBanner {
  id: string;
  image_url: string;
  collection_tag: string;
  heading: string;
  subheading: string;
  cta1_label: string;
  cta1_url: string;
  cta2_label: string;
  cta2_url: string;
}

const FALLBACK_BANNERS: HeroBanner[] = [
  {
    id: "f1", image_url: "/hero-banner/592347093_1190008066643058_5631399014138437439_n.jpg",
    collection_tag: "FW 2025", heading: "Lụa Đêm",
    subheading: "",
    cta1_label: "Same collection", cta1_url: "/shop?collection=thu-dong-2025",
    cta2_label: "View details", cta2_url: "/san-pham/lua-dem",
  },
];

function HeroCarousel() {
  const [banners, setBanners] = useState<HeroBanner[]>(FALLBACK_BANNERS);
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    supabase
      .from("hero_banners")
      .select("id, image_url, collection_tag, heading, subheading, cta1_label, cta1_url, cta2_label, cta2_url")
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
      className="relative aspect-[3/4] w-full overflow-hidden"
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
          <div className="absolute inset-x-0 bottom-0 flex flex-col items-center pb-12 text-center text-white">
            <h1 className="font-serif text-4xl leading-tight md:text-5xl lg:text-6xl drop-shadow-sm">
              {b.heading}
            </h1>

            {/* 2 CTA buttons */}
            <div className="mt-5 flex items-center gap-3">
              {b.cta1_label && (
                <Link
                  to={b.cta1_url}
                  className="rounded-full bg-white px-6 py-2.5 text-[13px] font-medium text-black transition-opacity hover:opacity-90"
                >
                  {b.cta1_label}
                </Link>
              )}
              {b.cta2_label && (
                <Link
                  to={b.cta2_url}
                  className="rounded-full border border-white/70 px-6 py-2.5 text-[13px] text-white/90 transition-colors hover:bg-white/10"
                >
                  {b.cta2_label}
                </Link>
              )}
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

function ArticleCard({ product, imgIndex }: { product: Product; imgIndex: number }) {
  const imgs = product.images ?? [];
  const src = imgs.length ? IMG_BASE + imgs[Math.min(imgIndex, imgs.length - 1)] : null;

  return (
    <Link to={`/san-pham/${product.id}`} className="group block">
      <div className="aspect-[2/3] overflow-hidden bg-[var(--color-tile)]">
        {src ? (
          <img
            src={src}
            alt={product.name}
            className="h-full w-full object-cover object-top transition-transform duration-700 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="h-full w-full" />
        )}
      </div>
      <div className="mt-3 space-y-0.5">
        <p className="text-sm">{product.name}</p>
        <p className="text-xs text-ink-soft">{vnd(product.price)}</p>
        <button
          className="text-[11px] uppercase tracking-[0.1em] underline underline-offset-2 text-ink-soft hover:text-ink transition-colors"
          onClick={(e) => e.preventDefault()}
        >
          Add to Wishlist
        </button>
      </div>
    </Link>
  );
}

export default function Home() {
  const [viewMode, setViewMode] = useState<"model" | "product">("model");
  const [thumbIdx, setThumbIdx] = useState(0);

  const sorted = [...products].sort((a, b) => (a.bestseller ?? 99) - (b.bestseller ?? 99));
  const featured = sorted.slice(0, 3);
  const top20 = sorted.slice(0, 4);

  // Collect up to 5 thumbnail images from featured products
  const thumbImgs: { src: string; productId: string }[] = [];
  for (const p of featured) {
    for (const img of p.images ?? []) {
      if (thumbImgs.length >= 5) break;
      thumbImgs.push({ src: IMG_BASE + img, productId: p.id });
    }
    if (thumbImgs.length >= 5) break;
  }

  // Image index to show: model = thumbIdx, product = last image of each product
  const getImgIndex = (p: Product) => {
    if (viewMode === "product") return (p.images?.length ?? 1) - 1;
    return thumbIdx;
  };

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
          <Link to="/shop" className="flex items-center gap-1 text-[12px] tracking-[0.1em] uppercase text-ink-soft hover:text-ink transition-colors">
            More <span aria-hidden>→</span>
          </Link>
        </div>

        {/* Mobile: horizontal snap scroll 1.1 cards; Desktop: 3-col grid */}
        <div className="-mx-6 flex snap-x snap-mandatory overflow-x-auto px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:grid md:grid-cols-3 md:gap-6 md:overflow-visible md:px-0">
          {featured.map((p) => (
            <div key={p.id} className="w-[88vw] shrink-0 snap-start pr-4 md:w-auto md:pr-0">
              <ArticleCard product={p} imgIndex={getImgIndex(p)} />
            </div>
          ))}
        </div>

        {/* Thumbnail strip + view toggle */}
        <div className="mt-8 flex flex-col items-center gap-4">
          {/* Thumbnails */}
          {thumbImgs.length > 0 && (
            <div className="flex items-end gap-3">
              {thumbImgs.map((t, i) => (
                <button
                  key={i}
                  onClick={() => { setThumbIdx(i); setViewMode("model"); }}
                  className={`overflow-hidden transition-all duration-200 ${
                    viewMode === "model" && thumbIdx === i
                      ? "ring-2 ring-ink ring-offset-1 opacity-100"
                      : "opacity-45 hover:opacity-75"
                  }`}
                  style={{ width: 56, height: 74 }}
                >
                  <img src={t.src} alt="" className="h-full w-full object-cover object-top" />
                </button>
              ))}
            </div>
          )}

          {/* PRODUCT VIEW ● MODEL VIEW toggle */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setViewMode("product")}
              className={`text-[11px] tracking-[0.15em] uppercase transition-colors ${
                viewMode === "product" ? "text-ink" : "text-ink-soft"
              }`}
            >
              Product View
            </button>
            {/* Radio dot */}
            <button
              onClick={() => setViewMode(viewMode === "model" ? "product" : "model")}
              className="flex h-4 w-8 items-center rounded-full border border-ink/30 px-0.5 transition-colors"
              aria-label="Toggle view"
            >
              <span
                className={`h-3 w-3 rounded-full bg-ink transition-transform duration-200 ${
                  viewMode === "model" ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
            <button
              onClick={() => setViewMode("model")}
              className={`text-[11px] tracking-[0.15em] uppercase transition-colors ${
                viewMode === "model" ? "text-ink" : "text-ink-soft"
              }`}
            >
              Model View
            </button>
          </div>
        </div>
      </section>

      {/* ══ THIS WEEK TOP 20 ══════════════════════════════════════════ */}
      <section className="px-6 py-10 md:px-8 lg:px-10">
        {/* Section header */}
        <div className="mb-6 flex items-end justify-between">
          <div>
            <p className="text-[11px] tracking-[0.18em] uppercase text-ink-soft">Best week</p>
            <h2 className="mt-0.5 font-serif text-3xl md:text-4xl">This week top 20</h2>
          </div>
          <Link to="/shop" className="flex items-center gap-1 text-[12px] tracking-[0.1em] uppercase text-ink-soft hover:text-ink transition-colors">
            More <span aria-hidden>→</span>
          </Link>
        </div>

        {/* Ranked grid */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-4">
          {top20.map((p) => (
            <Link key={p.id} to={`/san-pham/${p.id}`} className="group block">
              <div className="relative aspect-[2/3] overflow-hidden bg-[var(--color-tile)]">
                {p.images?.[0] && (
                  <img
                    src={IMG_BASE + p.images[0]}
                    alt={p.name}
                    className="h-full w-full object-cover object-top transition-transform duration-700 group-hover:scale-[1.03]"
                  />
                )}
              </div>
              <div className="mt-3 space-y-0.5">
                <p className="text-sm">{p.name}</p>
                <p className="text-xs text-ink-soft">{vnd(p.price)}</p>
                <button
                  className="text-[11px] uppercase tracking-[0.1em] underline underline-offset-2 text-ink-soft hover:text-ink transition-colors"
                  onClick={(e) => e.preventDefault()}
                >
                  Add to Wishlist
                </button>
              </div>
            </Link>
          ))}
        </div>
      </section>

    </div>
  );
}
