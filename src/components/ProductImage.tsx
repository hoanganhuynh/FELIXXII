import { IMG_BASE, type Product } from "../data/catalog";
import GarmentArt from "./GarmentArt";

/** Renders a real product photo when available; falls back to generated art. */
export default function ProductImage({
  item,
  index = 0,
  className = "",
  sizes,
}: {
  item: Product;
  index?: number;
  className?: string;
  sizes?: string;
}) {
  if (item.images && item.images.length) {
    const src = IMG_BASE + item.images[Math.min(index, item.images.length - 1)];
    return (
      <img
        src={src}
        alt={item.name}
        loading="lazy"
        sizes={sizes}
        className={`object-cover ${className}`}
      />
    );
  }

  return (
    <GarmentArt
      color={item.colors[0]?.hex}
      silhouette={item.silhouette}
      seed={index}
      className={className}
    />
  );
}
