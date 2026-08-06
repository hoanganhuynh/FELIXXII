import { Link } from "react-router-dom";
import ProductImage from "./ProductImage";
import type { Product } from "../data/catalog";
import { useWishlist } from "../store/wishlist";
import { useAuth } from "../store/auth";

export const vnd = (n: number) => `${n.toLocaleString("vi-VN")}₫`;

export default function ProductCard({ item, index = 0 }: { item: Product; index?: number }) {
  const tag = item.bestseller && item.bestseller <= 3 ? "Bestseller" : item.createdAt >= 20260101 ? "New" : null;
  const { toggle, has } = useWishlist();
  const { user, setLoginOpen } = useAuth();
  const saved = has(item.id);

  const handleWishlist = () => {
    if (!user) { setLoginOpen(true); return; }
    toggle(item.id);
  };

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

      <div className="mt-3 space-y-1">
        <Link to={`/san-pham/${item.id}`} className="block font-serif text-[15px] leading-snug">
          {item.name}
        </Link>
        <p className="text-sm tabular-nums text-ink-soft">{vnd(item.price)}</p>
        <button
          onClick={handleWishlist}
          className="link-underline pt-1 text-[11px] tracking-[0.08em] text-ink transition-opacity hover:opacity-60"
        >
          {saved ? "SAVED LIST ✓" : "ADD TO SAVED LIST"}
        </button>
      </div>
    </article>
  );
}
