import { Link } from "react-router-dom";
import ProductImage from "./ProductImage";
import type { Product, Accessory } from "../data/catalog";

export const vnd = (n: number) => `${n.toLocaleString("vi-VN")}₫`;

type Item = Product | Accessory;
const isAccessory = (it: Item): it is Accessory => "type" in it;

export default function ProductCard({ item, index = 0 }: { item: Item; index?: number }) {
  const acc = isAccessory(item);
  const tag = !acc
    ? item.bestseller && item.bestseller <= 3
      ? "Bestseller"
      : item.createdAt >= 20260101
        ? "New"
        : null
    : null;

  return (
    <article className="group">
      <Link to={`/san-pham/${item.id}`} className="block">
        <div className="relative aspect-[3/4] overflow-hidden rounded-sm bg-[var(--color-tile)]">
          <ProductImage
            item={item}
            index={index}
            sizes="(max-width: 768px) 50vw, 25vw"
            className="h-full w-full transition-transform duration-[800ms] ease-[var(--ease-out-expo)] group-hover:scale-[1.04]"
          />
          {tag && (
            <span className="label absolute left-3 top-3 bg-[var(--color-bg)]/90 px-2.5 py-1 text-[10px]">
              {tag}
            </span>
          )}
        </div>
      </Link>

      <div className="mt-3">
        <div className="flex items-baseline justify-between gap-2">
          <Link to={`/san-pham/${item.id}`} className="font-serif text-[15px] leading-none link-underline">
            {item.name}
          </Link>
          <span className="text-xs tabular-nums text-ink-soft">{vnd(item.price)}</span>
        </div>
        {acc ? (
          <p className="mt-1.5 text-xs text-ink-soft">{item.detail}</p>
        ) : (
          <div className="mt-2 flex items-center gap-1.5">
            {item.colors.map((c) => (
              <span
                key={c.name}
                title={c.name}
                className="h-3.5 w-3.5 rounded-full ring-1 ring-black/10"
                style={{ background: c.hex }}
              />
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
