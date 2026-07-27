import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { products } from "../data/catalog";
import ProductCard from "../components/ProductCard";
import { useBodyProfile } from "../store/bodyProfile";
import { useReveal } from "../hooks/useReveal";
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
    id: "f1", image_url: "/hero-banner/743731509_27507563182261413_5527702538560351911_n.jpg",
    collection_tag: "FW 2025", heading: "Fall — Winter 2025",
    subheading: "Đầm dạ hội & bridal may đo theo số đo cá nhân.",
    cta1_label: "Shop Now", cta1_url: "/shop",
    cta2_label: "View Collection", cta2_url: "/shop?collection=thu-dong-2025",
  },
  {
    id: "f2", image_url: "/hero-banner/742997904_27507562938928104_6898779848099059021_n.jpg",
    collection_tag: "SS 2026", heading: "Spring — Summer 2026",
    subheading: "Chiffon nhẹ, pastel, buông rũ tự nhiên.",
    cta1_label: "Shop Now", cta1_url: "/shop",
    cta2_label: "View Collection", cta2_url: "/shop?collection=xuan-he-2026",
  },
  {
    id: "f3", image_url: "/hero-banner/741258369_27507561415594923_8209792968027323554_n.jpg",
    collection_tag: "Bridal", heading: "Bridal Couture",
    subheading: "May đo riêng — hồ sơ số đo lưu suốt vòng đời.",
    cta1_label: "Shop Bridal", cta1_url: "/shop?cat=dam-bridal",
    cta2_label: "Book Fitting", cta2_url: "/about",
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
      className="relative h-[78vh] min-h-[480px] w-full overflow-hidden"
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
            className="absolute inset-0 h-full w-full object-cover object-[center_30%]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-black/20" />
          <div className="relative flex h-full flex-col justify-end px-5 pb-14 md:px-10 text-white">
            {b.collection_tag && <p className="label text-white/80">{b.collection_tag}</p>}
            <h1 className="mt-4 max-w-2xl font-serif text-5xl leading-[1.02] md:text-7xl">
              {b.heading}
            </h1>
            {b.subheading && (
              <p className="mt-3 max-w-lg text-[17px] text-white/75 leading-relaxed">{b.subheading}</p>
            )}
            <div className="mt-8 flex flex-wrap gap-4">
              {b.cta1_label && (
                <Link to={b.cta1_url} className="group rounded-full bg-white px-7 py-3.5 transition-opacity hover:opacity-90">
                  <span className="label text-ink">{b.cta1_label}</span>
                </Link>
              )}
              {b.cta2_label && (
                <Link to={b.cta2_url} className="group rounded-full border border-white px-7 py-3.5 transition-colors hover:bg-white">
                  <span className="label text-white group-hover:text-ink">{b.cta2_label}</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* prev / next */}
      {banners.length > 1 && (
        <>
          <button
            onClick={() => go(-1)}
            aria-label="Previous"
            className="absolute left-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/25"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <button
            onClick={() => go(1)}
            aria-label="Next"
            className="absolute right-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/25"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
          </button>
        </>
      )}

      {/* dots */}
      {banners.length > 1 && (
        <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-2">
          {banners.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`Banner ${i + 1}`}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === idx ? "w-6 bg-white" : "w-1.5 bg-white/45 hover:bg-white/75"
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default function Home() {
  const reveal = useReveal<HTMLDivElement>();
  const openBody = useBodyProfile((s) => s.setModal);
  const hasProfile = useBodyProfile((s) => !!s.measurements);
  const best = [...products].sort((a, b) => (a.bestseller ?? 99) - (b.bestseller ?? 99)).slice(0, 4);

  return (
    <div ref={reveal} className="pt-[62px]">
      {/* ---- HERO CAROUSEL ---- */}
      <HeroCarousel />


      {/* ---- BESTSELLERS ---- */}
      <section className="mx-auto max-w-[1800px] px-5 py-8 md:px-8">
        <div className="reveal mb-8 flex items-end justify-between">
          <h2 className="font-serif text-3xl">Season Bestsellers</h2>
          <Link to="/shop" className="text-xs underline underline-offset-2">View all</Link>
        </div>
        <div className="grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-4 md:gap-x-6">
          {best.map((p, i) => (
            <div key={p.id} className="reveal" style={{ transitionDelay: `${i * 60}ms` }}>
              <ProductCard item={p} index={i} />
            </div>
          ))}
        </div>
      </section>

      {/* ---- BODY PROFILE CTA (feature 4) ---- */}
      <section className="mx-auto max-w-[1800px] px-5 py-16 md:px-8">
        <div className="reveal flex flex-col items-center gap-4 rounded-lg bg-ink px-6 py-16 text-center text-[var(--color-bg)]">
          <p className="label text-[var(--color-bg)]/70">Personalization</p>
          <h2 className="max-w-xl font-serif text-3xl md:text-4xl">
            Save measurements once — find the perfect size every time.
          </h2>
          <p className="max-w-md text-sm text-[var(--color-bg)]/70">
            Enter 5 basic measurements, and our system will recommend the best fit for every product.
          </p>
          <button onClick={() => openBody(true)} className="mt-2 rounded-full bg-[var(--color-bg)] px-7 py-3.5 text-ink transition-transform hover:scale-105">
            <span className="label">{hasProfile ? "Update Body Profile" : "Create Body Profile"}</span>
          </button>
        </div>
      </section>
    </div>
  );
}
