import { IMG_BASE, type Product, type Accessory } from "../data/catalog";
import GarmentArt from "./GarmentArt";

type Item = Product | Accessory;

/** Renders a real product photo when available; falls back to generated art. */
export default function ProductImage({
  item,
  index = 0,
  className = "",
  sizes,
}: {
  item: Item;
  index?: number;
  className?: string;
  sizes?: string;
}) {
  const imgs = "images" in item ? item.images : undefined;

  if (imgs && imgs.length) {
    const src = IMG_BASE + imgs[Math.min(index, imgs.length - 1)];
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

  const acc = "type" in item;
  return (
    <GarmentArt
      color={item.colors[0]?.hex}
      silhouette={acc ? undefined : item.silhouette}
      accessory={acc ? item.type : undefined}
      seed={index}
      className={className}
    />
  );
}
