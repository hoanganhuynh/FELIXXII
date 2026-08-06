import { Link } from "react-router-dom";
import ProductImage from "../components/ProductImage";
import GarmentArt from "../components/GarmentArt";
import { useProducts } from "../store/products";
import { useReveal } from "../hooks/useReveal";

const pillars = [
  { icon: "01", title: "Private Fitting", text: "A quiet appointment to map posture, proportions, movement, and the tone of the occasion." },
  { icon: "02", title: "Material Edit", text: "Silk, satin, lace, and hand finishes are narrowed into a focused palette before the first cut." },
  { icon: "03", title: "Final Presence", text: "The finished look is styled as a complete silhouette, ready for ceremony, dinner, or portrait." },
];

const rituals = [
  { icon: "✦", title: "Silhouette", text: "A line is selected for the way it frames the shoulders, waist, and first step into the room." },
  { icon: "⌁", title: "Texture", text: "Fabric is reviewed in natural light and evening light before the final decision." },
  { icon: "○", title: "Presence", text: "Styling is pared back until the garment and the woman wearing it feel inseparable." },
  { icon: "◌", title: "Memory", text: "The final fitting is checked in movement, stillness, and photographs." },
];

export default function Proposal() {
  const reveal = useReveal<HTMLDivElement>();
  const products = useProducts((s) => s.products);
  const hero = products[0];
  const second = products[1] ?? products[0];
  const third = products[2] ?? products[0];
  const fourth = products[3] ?? products[0];
  const gallery = products.length > 0 ? products.slice(0, 6) : Array(6).fill(null);

  return (
    <div ref={reveal} className="pt-[62px]">
      <section className="grid min-h-[calc(100vh-62px)] border-b edge md:grid-cols-[1.05fr_0.95fr]">
        <div className="flex items-center px-6 py-20 md:px-12 lg:px-20">
          <div className="max-w-xl">
            <p className="reveal label text-ink-soft">FELIXXII PROPOSAL</p>
            <h1 className="reveal mt-5 font-serif text-5xl leading-[0.95] md:text-6xl lg:text-7xl">
              A couture note for the woman arriving fully herself.
            </h1>
            <p className="reveal mt-6 max-w-md text-sm leading-relaxed text-ink-soft">
              We design the proposal as a private sequence: garment, gesture, fitting, and final styling. Each piece is built around the body, the room, and the memory it needs to hold.
            </p>
            <Link
              to="/shop"
              className="reveal mt-8 inline-flex h-12 items-center rounded-full bg-ink px-8 text-sm text-white transition-opacity hover:opacity-85"
            >
              SHOP ALL
            </Link>
          </div>
        </div>
        <div className="min-h-[520px] bg-[var(--color-tile)]">
          {hero ? (
            <ProductImage item={hero} index={1} className="h-full w-full object-cover object-top" />
          ) : (
            <GarmentArt silhouette="a-line" color="#efe7d6" className="h-full w-full" />
          )}
        </div>
      </section>

      <section className="grid border-b edge md:grid-cols-3">
        {pillars.map((item) => (
          <div key={item.title} className="reveal border-b edge px-6 py-10 md:border-b-0 md:border-r md:last:border-r-0 lg:px-10">
            <p className="font-serif text-3xl text-ink-soft">{item.icon}</p>
            <h2 className="mt-8 text-xl">{item.title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">{item.text}</p>
          </div>
        ))}
      </section>

      <section className="grid border-b edge md:grid-cols-[0.9fr_1.1fr]">
        <div className="order-2 px-6 py-16 md:order-1 md:px-12 lg:px-20">
          <p className="reveal label text-ink-soft">THE FITTING ROOM</p>
          <h2 className="reveal mt-4 max-w-lg font-serif text-4xl leading-tight md:text-5xl">
            Every measurement becomes a design decision.
          </h2>
          <p className="reveal mt-5 max-w-md text-sm leading-relaxed text-ink-soft">
            Necklines are tested against posture. Length is balanced against the shoe, the aisle, and the way fabric falls when she turns. The proposal is not a sketch; it is a disciplined edit.
          </p>
        </div>
        <div className="order-1 aspect-[4/5] bg-[var(--color-tile)] md:order-2 md:aspect-auto">
          {second ? (
            <ProductImage item={second} index={1} className="h-full w-full object-cover object-top" />
          ) : (
            <GarmentArt silhouette="mermaid" color="#d8c7b1" className="h-full w-full" />
          )}
        </div>
      </section>

      <section className="grid border-b edge md:grid-cols-2">
        <div className="aspect-[4/5] bg-[var(--color-tile)]">
          {third ? (
            <ProductImage item={third} index={0} className="h-full w-full object-cover object-top" />
          ) : (
            <GarmentArt silhouette="ball-gown" color="#4a5a3a" className="h-full w-full" />
          )}
        </div>
        <div className="flex items-center px-6 py-16 md:px-12 lg:px-20">
          <div>
            <p className="reveal label text-ink-soft">MATERIAL LANGUAGE</p>
            <h2 className="reveal mt-4 font-serif text-4xl leading-tight md:text-5xl">
              Silk is chosen for what it says in motion.
            </h2>
            <p className="reveal mt-5 max-w-md text-sm leading-relaxed text-ink-soft">
              A matte finish for restraint. A luminous surface for evening. A structured waist when the dress must hold its own architecture.
            </p>
            <div className="reveal mt-8 grid max-w-md grid-cols-3 gap-3 text-center text-xs text-ink-soft">
              <span className="rounded-full border edge px-4 py-2">Silk</span>
              <span className="rounded-full border edge px-4 py-2">Satin</span>
              <span className="rounded-full border edge px-4 py-2">Lace</span>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b edge px-6 py-20 text-center md:px-12 lg:px-20">
        <p className="reveal label text-ink-soft">ATELIER NOTE</p>
        <blockquote className="reveal mx-auto mt-6 max-w-5xl font-serif text-4xl leading-tight md:text-5xl lg:text-6xl">
          “A proposal piece should not announce itself before she does. It should wait, then stay in the memory.”
        </blockquote>
        <p className="reveal mx-auto mt-6 max-w-xl text-sm leading-relaxed text-ink-soft">
          Our work is measured in small corrections: a cleaner shoulder, a softer fall at the hem, a neckline that leaves room for breath. The result is not loud. It is exact.
        </p>
      </section>

      <section className="grid border-b edge md:grid-cols-4">
        {rituals.map((item) => (
          <div key={item.title} className="reveal border-b edge px-6 py-10 md:border-b-0 md:border-r md:last:border-r-0 lg:px-10">
            <p className="font-serif text-4xl text-ink">{item.icon}</p>
            <h2 className="mt-8 text-lg">{item.title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">{item.text}</p>
          </div>
        ))}
      </section>

      <section className="border-b edge px-6 py-16 md:px-12 lg:px-20">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="reveal label text-ink-soft">GALLERY</p>
            <h2 className="reveal mt-3 font-serif text-4xl leading-tight md:text-5xl">Fragments from the proposal board.</h2>
          </div>
          <p className="reveal max-w-sm text-sm leading-relaxed text-ink-soft">
            A working moodboard of silhouettes, fabric behavior, and final-camera presence.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-6 md:gap-4">
          {gallery.map((product, i) => (
            <Link
              key={product?.id ?? i}
              to={product ? `/san-pham/${product.id}` : "/shop"}
              className={`reveal group block overflow-hidden bg-[var(--color-tile)] ${
                i === 0 || i === 5 ? "aspect-[3/4] md:col-span-2 md:row-span-2" : "aspect-[4/5] md:col-span-1"
              }`}
            >
              {product ? (
                <ProductImage
                  item={product}
                  index={i % 2}
                  className="h-full w-full object-cover object-top transition-transform duration-700 group-hover:scale-[1.04]"
                />
              ) : (
                <GarmentArt silhouette="a-line" color="#efe7d6" className="h-full w-full" />
              )}
            </Link>
          ))}
        </div>
      </section>

      <section className="grid border-b edge md:grid-cols-[1.15fr_0.85fr]">
        <div className="flex items-center px-6 py-16 md:px-12 lg:px-20">
          <div>
            <p className="reveal label text-ink-soft">FINAL EDIT</p>
            <h2 className="reveal mt-4 max-w-xl font-serif text-4xl leading-tight md:text-5xl">
              The proposal ends when the piece feels inevitable.
            </h2>
            <p className="reveal mt-5 max-w-md text-sm leading-relaxed text-ink-soft">
              We remove anything that competes with her. What remains is proportion, material, and a quiet confidence that photographs beautifully.
            </p>
            <Link to="/shop" className="reveal mt-8 inline-flex h-12 items-center rounded-full border border-ink px-8 text-sm transition-colors hover:bg-ink hover:text-white">
              DISCOVER PIECES
            </Link>
          </div>
        </div>
        <div className="aspect-[3/4] bg-[var(--color-tile)] md:aspect-auto">
          {fourth ? (
            <ProductImage item={fourth} index={1} className="h-full w-full object-cover object-top" />
          ) : (
            <GarmentArt silhouette="shift" color="#8b1e2d" className="h-full w-full" />
          )}
        </div>
      </section>

      <section className="px-6 py-20 md:px-12 lg:px-20">
        <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="reveal label text-ink-soft">PARAGRAPH</p>
            <h2 className="reveal mt-4 font-serif text-4xl leading-tight md:text-5xl">
              The proposal is written before it is sewn.
            </h2>
          </div>
          <div className="space-y-5 text-sm leading-7 text-ink-soft">
            <p className="reveal">
              We begin with the atmosphere of the event: morning ceremony, private dinner, destination portrait, city hall, or a room filled with family. From there, each design choice is measured against the feeling it must protect.
            </p>
            <p className="reveal">
              A FELIXXII proposal can be restrained or luminous, structured or fluid. What matters is that every line has a reason. The piece should carry intimacy up close and clarity from a distance.
            </p>
            <p className="reveal">
              The final garment is not treated as a costume for one day. It is a record of a threshold: the moment before the next life begins.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
