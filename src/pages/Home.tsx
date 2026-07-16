import { Link } from "react-router-dom";
import { products, COLLECTIONS, CATEGORIES, IMG_BASE } from "../data/catalog";
import ProductCard from "../components/ProductCard";
import { useBodyProfile } from "../store/bodyProfile";
import { useReveal } from "../hooks/useReveal";

export default function Home() {
  const reveal = useReveal<HTMLDivElement>();
  const openBody = useBodyProfile((s) => s.setModal);
  const hasProfile = useBodyProfile((s) => !!s.measurements);
  const best = [...products].sort((a, b) => (a.bestseller ?? 99) - (b.bestseller ?? 99)).slice(0, 4);

  return (
    <div ref={reveal} className="pt-[62px]">
      {/* ---- HERO ---- */}
      <section className="relative h-[78vh] min-h-[480px] w-full overflow-hidden">
        <img
          src={IMG_BASE + "600332183_1201900768787121_2051984339437065533_n.jpg"}
          alt="SEN — Thu Đông 2025"
          className="absolute inset-0 h-full w-full object-cover object-[center_30%]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-black/20" />
        <div className="relative flex h-full flex-col justify-end px-5 pb-14 md:px-10 text-white">
          <p className="label text-white/80">Fall — Winter 2025 · FW25</p>
          <h1 className="mt-4 max-w-2xl font-serif text-5xl leading-[1.02] md:text-7xl">
            Draped silk, deep tones,<br />and your silhouette.
          </h1>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link to="/shop?collection=thu-dong-2025" className="group rounded-full bg-white px-7 py-3.5 transition-opacity hover:opacity-90">
              <span className="label text-ink">Explore Collection</span>
            </Link>
            <Link to="/shop?cat=dam-da-hoi" className="group rounded-full border border-white px-7 py-3.5 transition-colors hover:bg-white">
              <span className="label text-white group-hover:text-ink">Shop by Category</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ---- TWO ENTRY POINTS (feature 1) ---- */}
      <section className="mx-auto max-w-[1800px] px-5 py-16 md:px-8">
        <div className="reveal grid gap-10 lg:grid-cols-2">
          {/* by collection — narrative */}
          <div>
            <p className="label text-ink-soft">By Narrative</p>
            <h2 className="mt-1 font-serif text-2xl">Collections</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {COLLECTIONS.map((c) => (
                <Link key={c.id} to={`/shop?collection=${c.id}`} className="group block overflow-hidden rounded-sm border edge">
                  <div className="relative aspect-[4/5] sm:aspect-square md:aspect-[4/5] overflow-hidden bg-[var(--color-tile)]">
                    {c.image && (
                      <img src={IMG_BASE + c.image} alt={c.label} className="absolute inset-0 h-full w-full object-cover object-top transition-transform duration-700 group-hover:scale-105" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <div className="absolute inset-0 flex items-end p-5 text-white">
                      <div>
                        <p className="font-serif text-2xl">{c.label}</p>
                        <p className="mt-1 text-xs text-white/80">{c.note}</p>
                      </div>
                    </div>
                    <span className="absolute right-4 top-4 text-[10px] tracking-wide text-white/90">{c.season}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* by category — utilitarian */}
          <div>
            <p className="label text-ink-soft">By Category</p>
            <h2 className="mt-1 font-serif text-2xl">Categories</h2>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {CATEGORIES.map((cat) => (
                <Link key={cat.id} to={`/shop?cat=${cat.id}`} className="group flex aspect-square flex-col items-center justify-center gap-2 rounded-sm border edge transition-colors hover:bg-[var(--color-tile)]">
                  <span className="text-sm">{cat.label}</span>
                  <span className="text-[10px] text-ink-soft transition-transform group-hover:translate-x-1">View →</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

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
