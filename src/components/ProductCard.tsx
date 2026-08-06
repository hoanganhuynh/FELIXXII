import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import ProductImage from "./ProductImage";
import type { Product } from "../data/catalog";
import { useCart } from "../store/cart";
import { useCampaigns } from "../store/campaigns";
import { computeProductPricing } from "../lib/discount";

export const vnd = (n: number) => `${n.toLocaleString("vi-VN")}₫`;

type ProductCardImageMode = "auto" | "model" | "product";

export default function ProductCard({ item, imageMode = "auto" }: { item: Product; index?: number; imageMode?: ProductCardImageMode }) {
  const tag = item.bestseller && item.bestseller <= 3 ? "Bestseller" : item.createdAt >= 20260101 ? "New" : null;
  const add = useCart((s) => s.add);
  const campaigns = useCampaigns((s) => s.campaigns);
  const fetchCampaigns = useCampaigns((s) => s.fetch);
  const pricing = useMemo(() => computeProductPricing(item, campaigns), [campaigns, item]);
  const discountPercent = pricing.onSale ? Math.round((pricing.discountAmount / pricing.originalPrice) * 100) : 0;

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const findImageIndex = (src?: string | null, fallback = 0) => {
    if (!item.images?.length || !src) return fallback;
    const index = item.images.findIndex((image) => image === src);
    return index >= 0 ? index : fallback;
  };

  const primaryImageIndex = imageMode === "product"
    ? findImageIndex(item.productImage, 0)
    : findImageIndex(item.modelImage, item.images && item.images.length > 1 ? 1 : 0);
  const hoverImageIndex = findImageIndex(item.productImage, 0);
  const canSwapImage = imageMode === "auto" && hoverImageIndex !== primaryImageIndex;

  const handleAddToCart = () => {
    add({
      id: item.id,
      name: item.name,
      price: item.price,
      size: item.sizes[0],
      colorName: item.color?.name,
      colorHex: item.color?.hex,
    });
  };

  return (
    <article className="group">
      <Link to={`/san-pham/${item.id}`} className="block">
        <div className="relative aspect-[3/4] overflow-hidden rounded-sm bg-[var(--color-tile)]">
          <ProductImage
            item={item}
            index={primaryImageIndex}
            sizes="(max-width: 768px) 50vw, 25vw"
            className="h-full w-full transition-transform duration-[800ms] ease-[var(--ease-out-expo)] group-hover:scale-[1.04]"
          />
          {canSwapImage && (
            <ProductImage
              item={item}
              index={hoverImageIndex}
              sizes="(max-width: 768px) 50vw, 25vw"
              className="absolute inset-0 h-full w-full opacity-0 transition-[opacity,transform] duration-[800ms] ease-[var(--ease-out-expo)] group-hover:scale-[1.04] group-hover:opacity-100"
            />
          )}
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
        <p className="flex flex-wrap items-baseline gap-2 text-sm tabular-nums">
          <span className={pricing.onSale ? "text-[var(--color-accent)]" : "text-ink-soft"}>{vnd(pricing.price)}</span>
          {discountPercent > 0 && <span className="rounded-md bg-ink px-2 py-0.5 text-[11px] font-medium leading-none text-white">-{discountPercent}%</span>}
          {pricing.onSale && <span className="text-xs text-ink-soft line-through">{vnd(pricing.originalPrice)}</span>}
        </p>
        <button
          onClick={handleAddToCart}
          className="link-underline pt-1 text-[11px] tracking-[0.08em] text-ink transition-opacity hover:opacity-60"
        >
          ADD TO CART
        </button>
      </div>
    </article>
  );
}
