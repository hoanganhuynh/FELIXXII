import { useEffect, useState } from "react";
import { resolveImageUrl, type Product } from "../data/catalog";
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
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const imageKey = item.images?.join("|") ?? "";

  useEffect(() => {
    setFailedSrc(null);
  }, [item.id, index, imageKey]);

  if (item.images && item.images.length) {
    const src = resolveImageUrl(item.images[Math.min(index, item.images.length - 1)]);
    if (failedSrc !== src) {
      return (
        <img
          src={src}
          alt={item.name}
          loading="lazy"
          sizes={sizes}
          onError={() => setFailedSrc(src)}
          className={`object-cover ${className}`}
        />
      );
    }
  }

  return (
    <GarmentArt
      color={item.color?.hex ?? item.colors[0]?.hex}
      silhouette={item.silhouette}
      seed={index}
      className={className}
    />
  );
}
