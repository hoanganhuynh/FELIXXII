import { Link } from "react-router-dom";
import GarmentArt from "../components/GarmentArt";
import { useReveal } from "../hooks/useReveal";

export default function About() {
  const reveal = useReveal<HTMLDivElement>();
  return (
    <div ref={reveal} className="pt-[62px]">
      <section className="border-b edge px-5 py-20 text-center md:px-8">
        <p className="label reveal text-ink-soft">SEN — Atelier</p>
        <h1 className="reveal mx-auto mt-4 max-w-3xl font-serif text-4xl leading-tight md:text-5xl">
          Couture fashion, tailored around your silhouette.
        </h1>
        <p className="reveal mx-auto mt-5 max-w-xl text-sm leading-relaxed text-ink-soft">
          This is a demo/case-study: an evening & bridal couture brand with personal body profiles, 
          styling suggestions, and smart filters. Brand name, images, and content are original works used for illustration.
        </p>
      </section>
      <section className="grid md:grid-cols-3">
        {(["mermaid", "a-line", "ball-gown"] as const).map((s, i) => (
          <div key={s} className="reveal border-b edge md:border-b-0 md:border-r md:last:border-r-0" style={{ transitionDelay: `${i * 90}ms` }}>
            <GarmentArt silhouette={s} color={["#7c1f2b", "#4a5a3a", "#efe7d6"][i]} seed={i} className="w-full" />
          </div>
        ))}
      </section>
      <section className="mx-auto max-w-[900px] px-5 py-20 text-center md:px-8">
        <Link to="/shop" className="reveal inline-block rounded-full border border-ink px-10 py-3.5 text-xs tracking-[0.02em] transition-colors hover:bg-ink hover:text-white">
          DISCOVER THE COLLECTION
        </Link>
      </section>
    </div>
  );
}
