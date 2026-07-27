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

function HeroCarousel() {
  const [banners, setBanners] = useState<HeroBanner[]>([]);
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

  if (!banners.length) {
    return (
      <section className="relative h-screen w-full overflow-hidden bg-neutral-900">
        <div className="absolute inset-0 animate-pulse bg-neutral-800/60" />
      </section>
    );
  }

  return (
    <section
      className="relative h-screen w-full overflow-hidden"
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
            className="absolute inset-0 h-full w-full object-cover object-[center_25%]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

          {/* Center-bottom text block — Gentle Monster style */}
          <div className="absolute inset-x-0 bottom-0 flex flex-col items-center pb-20 text-center text-white">
            {b.collection_tag && (
              <p className="text-[11px] tracking-[0.25em] uppercase text-white/70">{b.collection_tag}</p>
            )}
            <h1 className="mt-3 font-serif text-3xl leading-tight tracking-wide md:text-5xl lg:text-6xl">
              {b.heading}
            </h1>
            {b.subheading && (
              <p className="mt-2 max-w-sm text-[14px] text-white/60 leading-relaxed">{b.subheading}</p>
            )}
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {b.cta1_label && (
                <Link
                  to={b.cta1_url}
                  className="rounded-full border border-white/70 px-8 py-2.5 text-[12px] tracking-[0.15em] uppercase text-white transition-colors hover:bg-white hover:text-black"
                >
                  {b.cta1_label}
                </Link>
              )}
              {b.cta2_label && (
                <Link
                  to={b.cta2_url}
                  className="rounded-full border border-white/30 px-8 py-2.5 text-[12px] tracking-[0.15em] uppercase text-white/70 transition-colors hover:border-white/70 hover:text-white"
                >
                  {b.cta2_label}
                </Link>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Prev / Next */}
      {banners.length > 1 && (
        <>
          <button onClick={() => go(-1)} aria-label="Previous" className="absolute left-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center text-white/60 transition-colors hover:text-white">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <button onClick={() => go(1)} aria-label="Next" className="absolute right-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center text-white/60 transition-colors hover:text-white">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 18l6-6-6-6" /></svg>
          </button>
        </>
      )}

      {/* Dots */}
      {banners.length > 1 && (
        <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 gap-1.5">
          {banners.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`Banner ${i + 1}`}
              className={`h-px rounded-none transition-all duration-300 bg-white ${
                i === idx ? "w-8 opacity-100" : "w-4 opacity-40"
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function getImg(p: Product, idx: number, mode: "model" | "product"): string | null {
  const imgs = p.images ?? [];
  if (!imgs.length) return null;
  if (mode === "product") return IMG_BASE + imgs[imgs.length - 1];
  return IMG_BASE + imgs[Math.min(idx, imgs.length - 1)];
}

export default function Home() {
  const [viewMode, setViewMode] = useState<"model" | "product">("model");
  const [modelIdx, setModelIdx] = useState(0);

  const sorted = [...products].sort((a, b) => (a.bestseller ?? 99) - (b.bestseller ?? 99));
  const featured = sorted.slice(0, 3);
  const topProducts = sorted;

  // Use product with most images for the thumbnail strip
  const thumbProduct = featured.reduce((max, p) =>
    (p.images?.length ?? 0) > (max.images?.length ?? 0) ? p : max
  );
  const thumbImgs = thumbProduct.images ?? [];

  return (
    <div className="pt-[62px]">

      {/* ══ 1. HERO ══════════════════════════════════════════════════ */}
      <HeroCarousel />

      {/* ══ 2. FEATURED PRODUCTS — 2 MODES ══════════════════════════ */}
      <section className="w-full border-t border-[var(--color-edge)]">
        {/* Section label */}
        <div className="flex items-center justify-between px-5 py-3 md:px-8">
          <p className="text-[10px] tracking-[0.2em] uppercase text-ink-soft">New Collection</p>
          <Link to="/shop" className="text-[10px] tracking-[0.15em] uppercase text-ink-soft hover:text-ink transition-colors">View All →</Link>
        </div>

        {/* 3-column grid — edge to edge */}
        <div className="grid grid-cols-3 divide-x divide-[var(--color-edge)] border-t border-[var(--color-edge)]">
          {featured.map((p) => {
            const src = getImg(p, modelIdx, viewMode);
            return (
              <Link key={p.id} to={`/san-pham/${p.id}`} className="group block">
                <div className="aspect-[3/4] overflow-hidden bg-[var(--color-tile)]">
                  {src ? (
                    <img
                      src={src}
                      alt={p.name}
                      className="h-full w-full object-cover object-top transition-transform duration-700 group-hover:scale-[1.04]"
                    />
                  ) : (
                    <div className="h-full w-full bg-[var(--color-tile)]" />
                  )}
                </div>
                <div className="border-t border-[var(--color-edge)] px-4 py-4 md:px-5">
                  <p className="text-sm">{p.name}</p>
                  <p className="mt-0.5 text-xs text-ink-soft">{vnd(p.price)}</p>
                  <button
                    className="mt-2 text-[10px] tracking-[0.1em] uppercase text-ink-soft underline-offset-2 hover:underline transition-colors"
                    onClick={(e) => e.preventDefault()}
                  >
                    Add to Wishlist
                  </button>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Control bar: thumbnails left · toggle right */}
        <div className="flex items-center justify-between border-t border-[var(--color-edge)] px-4 py-3 md:px-5">
          {/* Thumbnail strip */}
          <div className="flex items-center gap-2">
            {thumbImgs.map((img, i) => (
              <button
                key={i}
                onClick={() => { setModelIdx(i); setViewMode("model"); }}
                title={`Look ${i + 1}`}
                className={`h-9 w-9 overflow-hidden rounded-full transition-all duration-200 ${
                  viewMode === "model" && modelIdx === i
                    ? "ring-2 ring-ink ring-offset-1"
                    : "opacity-50 hover:opacity-80"
                }`}
              >
                <img src={IMG_BASE + img} alt="" className="h-full w-full object-cover object-top" />
              </button>
            ))}
          </div>

          {/* View mode toggle */}
          <div className="flex items-center gap-0">
            {(["model", "product"] as const).map((m, i) => (
              <span key={m} className="flex items-center">
                {i > 0 && <span className="mx-2 text-ink-soft/30 text-xs select-none">|</span>}
                <button
                  onClick={() => setViewMode(m)}
                  className={`text-[10px] tracking-[0.15em] uppercase transition-colors ${
                    viewMode === m ? "text-ink font-medium" : "text-ink-soft hover:text-ink"
                  }`}
                >
                  {m === "model" ? "Model View" : "Product View"}
                </button>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ══ 3. BEST: THIS WEEK ══════════════════════════════════════ */}
      <section className="border-t border-[var(--color-edge)]">
        {/* Heading row */}
        <div className="flex items-end justify-between px-5 py-8 md:px-8">
          <div>
            <p className="font-serif text-4xl leading-none tracking-tight md:text-5xl">BEST:</p>
            <p className="mt-1 text-[10px] tracking-[0.25em] uppercase text-ink-soft">
              This Week · Top {topProducts.length}
            </p>
          </div>
          <Link to="/shop" className="text-[11px] underline underline-offset-2 text-ink-soft hover:text-ink transition-colors">
            View all
          </Link>
        </div>

        {/* Ranked grid */}
        <div className="grid grid-cols-2 border-t border-[var(--color-edge)] divide-y divide-[var(--color-edge)] md:grid-cols-4 md:divide-y-0 md:divide-x lg:grid-cols-5">
          {topProducts.map((p, i) => (
            <Link
              key={p.id}
              to={`/san-pham/${p.id}`}
              className="group block border-[var(--color-edge)] md:border-t-0 [&:nth-child(odd)]:border-r [&:nth-child(odd)]:md:border-r-0"
            >
              <div className="relative aspect-[3/4] overflow-hidden bg-[var(--color-tile)]">
                {p.images?.[0] ? (
                  <img
                    src={IMG_BASE + p.images[0]}
                    alt={p.name}
                    className="h-full w-full object-cover object-top transition-transform duration-700 group-hover:scale-[1.04]"
                  />
                ) : (
                  <div className="h-full w-full" />
                )}
                {/* Rank number */}
                <span className="absolute left-3 top-3 font-serif text-4xl leading-none text-white/50 md:text-5xl">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
              <div className="border-t border-[var(--color-edge)] px-4 py-3">
                <p className="text-sm">{p.name}</p>
                <p className="mt-0.5 text-xs text-ink-soft">{vnd(p.price)}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

    </div>
  );
}
