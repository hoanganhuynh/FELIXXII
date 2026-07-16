import { useMemo, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import {
  productById,
  accessoryById,
  products,
  LOOK_LABELS,
  categoryLabel,
  collectionLabel,
  type AccessoryType,
} from "../data/catalog";
import { SIZE_CHART, recommendSize } from "../data/sizing";
import { useCart } from "../store/cart";
import { useBodyProfile } from "../store/bodyProfile";
import ProductImage from "../components/ProductImage";
import ProductCard, { vnd } from "../components/ProductCard";
import NotFound from "./NotFound";

export default function Product() {
  const { id } = useParams();
  const product = id ? productById(id) : undefined;
  const accessory = id && !product ? accessoryById(id) : undefined;
  const item = product ?? accessory;

  const add = useCart((s) => s.add);
  const measurements = useBodyProfile((s) => s.measurements);
  const openBody = useBodyProfile((s) => s.setModal);

  const [colorIdx, setColorIdx] = useState(0);
  const [size, setSize] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  const stdSizes = useMemo(() => (product ? product.sizes.filter((s) => s !== "Custom") : []), [product]);
  const rec = useMemo(
    () => (product && measurements ? recommendSize(measurements, stdSizes) : null),
    [product, measurements, stdSizes],
  );

  if (!item) return <NotFound />;
  const color = item.colors[colorIdx] ?? item.colors[0];

  const handleAdd = () => {
    if (product && !size) {
      setSize(rec?.size ?? product.sizes[0]);
    }
    add({
      id: item.id,
      name: item.name,
      price: item.price,
      size: product ? (size ?? rec?.size ?? product.sizes[0]) : undefined,
      colorName: color?.name,
      colorHex: color?.hex,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <div className="pt-[62px]">
      <div className="mx-auto grid max-w-[1800px] lg:grid-cols-[1fr_500px] xl:grid-cols-[1fr_560px]">
        {/* gallery */}
        <div className="grid grid-cols-1 sm:grid-cols-2">
          {(product?.images?.length ? product.images.map((_, i) => i) : [0, 3, 6]).map((idx, n) => (
            <div
              key={n}
              className={`overflow-hidden bg-[var(--color-tile)] ${
                n === 0 ? "aspect-[4/5] sm:col-span-2" : "aspect-[3/4]"
              }`}
            >
              <ProductImage item={item} index={idx} className="h-full w-full" />
            </div>
          ))}
        </div>

        {/* info (sticky) */}
        <div className="lg:sticky lg:top-[62px] lg:h-fit">
          <div className="px-5 py-10 md:px-10 lg:px-12 lg:py-14">
            <p className="text-xs text-ink-soft">
              <Link to="/shop" className="link-underline">
                {categoryLabel(item.category)}
              </Link>
              <span className="mx-1.5">·</span>
              {collectionLabel(item.collection)}
            </p>

            <h1 className="mt-3 font-serif text-3xl">{item.name}</h1>
            <p className="mt-2 font-serif text-lg">{vnd(item.price)}</p>
            {accessory && <p className="mt-1 text-sm text-ink-soft">{accessory.detail}</p>}
            {product && <p className="mt-5 max-w-md text-sm leading-relaxed text-ink-soft">{product.blurb}</p>}

            {/* colour */}
            <div className="mt-7">
              <p className="text-xs text-ink-soft">Color: <span className="text-ink">{color?.name}</span></p>
              <div className="mt-2 flex gap-2.5">
                {item.colors.map((c, i) => (
                  <button
                    key={c.name}
                    aria-label={c.name}
                    onClick={() => setColorIdx(i)}
                    className={`h-8 w-8 rounded-full ring-1 transition-transform ${i === colorIdx ? "ring-2 ring-ink scale-110" : "ring-black/10"}`}
                    style={{ background: c.hex }}
                  />
                ))}
              </div>
            </div>

            {/* size + recommendation (feature 4) */}
            {product && (
              <div className="mt-7">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-ink-soft">Size</p>
                  {rec ? (
                    <span className="text-xs text-[var(--color-accent)]">
                      Your profile ⭢ best fit <b>size {rec.size}</b>
                    </span>
                  ) : (
                    <button onClick={() => openBody(true)} className="text-xs text-ink-soft underline underline-offset-2">
                      Enter measurements for size recommendation
                    </button>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {product.sizes.map((s) => {
                    const isRec = rec?.size === s;
                    const on = size === s;
                    return (
                      <button
                        key={s}
                        onClick={() => setSize(s)}
                        className={`relative min-w-11 rounded border px-3 py-2 text-sm transition-colors ${
                          on ? "border-ink bg-ink text-white" : "edge hover:border-ink"
                        }`}
                      >
                        {s}
                        {isRec && !on && (
                          <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-[var(--color-accent)]" />
                        )}
                      </button>
                    );
                  })}
                </div>
                {rec && (
                  <p className="mt-2 rounded bg-[var(--color-tile)] px-3 py-2 text-xs text-ink-soft">
                    Recommendation based on your profile · fit {rec.confidence}
                    {rec.notes.length > 0 && <> — {rec.notes.join("; ")}.</>}
                  </p>
                )}
              </div>
            )}

            {/* actions */}
            <button
              onClick={handleAdd}
              className="mt-8 h-12 w-full max-w-[380px] rounded-lg bg-ink text-white transition-opacity hover:opacity-85"
            >
              <span className="label text-white">{added ? "ADDED TO CART ✓" : "ADD TO CART"}</span>
            </button>
            {product?.customizable && (
              <button className="mt-3 block text-xs text-[var(--color-accent)] underline underline-offset-2">
                Request custom sizing based on my profile →
              </button>
            )}

            {/* body-type compatibility (feature 3) */}
            {product && (
              <div className="mt-8 flex gap-3 rounded-md bg-[var(--color-tile)] px-4 py-3">
                <span aria-hidden className="text-lg">👗</span>
                <div>
                  <p className="text-xs font-medium">Body Type Compatibility</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">{product.bodyType}</p>
                </div>
              </div>
            )}

            {/* accordions */}
            <div className="mt-8">
              {product && (
                <Accordion title="Material & Care">
                  <p className="mb-2">Material: {product.material}</p>
                  <ul className="list-disc space-y-1 pl-4">
                    {product.care.map((c) => <li key={c}>{c}</li>)}
                  </ul>
                </Accordion>
              )}
              {product && (
                <Accordion title="Size Guide">
                  <SizeChart recSize={rec?.size} sizes={stdSizes} />
                </Accordion>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ---- COMPLETE THE LOOK (feature 3) ---- */}
      {product?.look && <CompleteTheLook look={product.look} />}

      {/* similar */}
      <section className="mx-auto max-w-[1800px] px-5 py-16 md:px-8">
        <h2 className="mb-8 font-serif text-2xl">You might also like</h2>
        <div className="grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-4 md:gap-x-6">
          {products.filter((p) => p.id !== item.id).slice(0, 4).map((p, i) => (
            <ProductCard key={p.id} item={p} index={i} />
          ))}
        </div>
      </section>
    </div>
  );
}

function CompleteTheLook({ look }: { look: Partial<Record<AccessoryType, string[]>> }) {
  const groups = (Object.keys(look) as AccessoryType[])
    .map((type) => ({ type, items: (look[type] ?? []).map((id) => accessoryById(id)).filter(Boolean) }))
    .filter((g) => g.items.length);

  return (
    <section className="border-y edge bg-[var(--color-tile)]/40 px-5 py-16 md:px-8">
      <div className="mx-auto max-w-[1800px]">
        <p className="label text-[var(--color-accent)]">Styling suggestion</p>
        <h2 className="mt-2 font-serif text-3xl">Complete the look</h2>
        <p className="mt-2 max-w-md text-sm text-ink-soft">
          Pair with accessories handpicked by our stylist for this piece.
        </p>

        <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 lg:grid-cols-5">
          {groups.map((g) => (
            <div key={g.type}>
              <p className="mb-3 text-xs font-medium">{LOOK_LABELS[g.type]}</p>
              {g.items.map((a) => a && <ProductCard key={a.id} item={a} />)}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SizeChart({ recSize, sizes }: { recSize?: string; sizes: string[] }) {
  return (
    <table className="w-full text-xs tabular-nums">
      <thead>
        <tr className="text-left text-ink-soft">
          <th className="py-1.5 font-normal">Size</th>
          <th className="py-1.5 font-normal">Bust (cm)</th>
          <th className="py-1.5 font-normal">Waist (cm)</th>
          <th className="py-1.5 font-normal">Hips (cm)</th>
        </tr>
      </thead>
      <tbody>
        {SIZE_CHART.filter((r) => sizes.includes(r.size)).map((r) => {
          const isRec = recSize === r.size;
          return (
            <tr key={r.size} className={`border-t edge ${isRec ? "bg-[var(--color-accent-soft)] font-medium" : ""}`}>
              <td className="py-1.5">{r.size}{isRec && <span className="ml-1 text-[var(--color-accent)]">• you</span>}</td>
              <td className="py-1.5">{r.bust[0]}–{r.bust[1]}</td>
              <td className="py-1.5">{r.waist[0]}–{r.waist[1]}</td>
              <td className="py-1.5">{r.hip[0]}–{r.hip[1]}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function Accordion({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="group border-t edge py-4">
      <summary className="flex cursor-pointer list-none items-center justify-between text-xs uppercase tracking-[0.02em]">
        {title}
        <span className="text-ink-soft transition-transform group-open:rotate-45">+</span>
      </summary>
      <div className="mt-3 text-xs leading-relaxed text-ink-soft">{children}</div>
    </details>
  );
}
