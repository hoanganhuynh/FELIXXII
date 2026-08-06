import { create } from "zustand";
import { supabase } from "../lib/supabase";
import type { Database } from "../lib/database.types";
import type { Product, ColorSwatch, Silhouette, Occasion } from "../data/catalog";

type StyleListRow = Database["public"]["Views"]["style_list"]["Row"];
type NewArrivalRow = Database["public"]["Functions"]["storefront_new_arrivals"]["Returns"][number];

interface ColorVariant { name: string; hex: string; sizes: string[] }

function productNameWithColor(styleName: string, colorName: string): string {
  const cleanStyleName = styleName.trim();
  const cleanColorName = colorName.trim();
  if (!cleanColorName) return cleanStyleName;
  return cleanStyleName.toLowerCase().endsWith(cleanColorName.toLowerCase())
    ? cleanStyleName
    : `${cleanStyleName} ${cleanColorName}`;
}

/** One style → one Product per colour it comes in (e.g. a style with
 *  black-S/black-L/red-S variants becomes 2 Products: "· black" with sizes
 *  [S,L] and "· red" with sizes [S]) — matches the storefront card grid,
 *  where each colour is its own product, not a swatch on a shared card. */
function mapStyleToProducts(
  s: StyleListRow,
  bestseller: number | undefined,
  newArrival: { rank: number; weeklyUnits: number } | undefined
): Product[] {
  const slotted = [s.image_product_view, s.image_model_view, ...(s.images_detail ?? [])].filter(Boolean) as string[];
  const images = slotted.length ? slotted : ((s.images ?? []) as string[]);
  const allColors = Array.isArray(s.colors) ? (s.colors as unknown as ColorSwatch[]) : [];
  const colorVariants = Array.isArray(s.color_variants) ? (s.color_variants as unknown as ColorVariant[]) : [];

  const base = {
    styleId: s.id!,
    name: s.name ?? "",
    category: s.category_id ?? "",
    collection: s.collection_id ?? "",
    garmentTypeId: s.garment_type_id ?? undefined,
    sourceId: s.source_id ?? undefined,
    price: s.price ?? 0,
    colors: allColors,
    silhouette: (s.silhouette as Silhouette) ?? undefined,
    occasion: (s.occasion as Occasion) ?? "event",
    bodyType: s.body_type ?? "",
    care: [],
    material: s.material ?? "",
    customizable: false,
    bestseller,
    newArrivalRank: newArrival?.rank,
    weeklyUnitsSold: newArrival?.weeklyUnits,
    createdAt: s.created_at ? new Date(s.created_at).getTime() : 0,
    blurb: s.description ?? "",
    images: images.length ? images : undefined,
  };

  if (!colorVariants.length) {
    return [{ ...base, id: s.id!, sizes: Array.isArray(s.sizes) ? (s.sizes as string[]) : [] }];
  }

  return colorVariants.map((cv) => ({
    ...base,
    id: `${s.id}::${cv.hex.replace("#", "")}`,
    name: productNameWithColor(base.name, cv.name),
    color: { name: cv.name, hex: cv.hex },
    sizes: cv.sizes ?? [],
  }));
}

interface ProductsState {
  products: Product[];
  loading: boolean;
  loaded: boolean;
  error: string | null;
  fetch: () => Promise<void>;
}

/** Live storefront catalogue, sourced from the admin-managed Supabase
 *  `styles`/`variants` tables (via the `style_list` view, which already
 *  restricts anonymous reads to active styles via RLS). Fetched once and
 *  cached for the session — call `fetch()` from anywhere, it's idempotent. */
export const useProducts = create<ProductsState>((set, get) => ({
  products: [],
  loading: false,
  loaded: false,
  error: null,
  fetch: async () => {
    if (get().loaded || get().loading) return;
    set({ loading: true, error: null });
    const [stylesResult, arrivalsResult] = await Promise.all([
      supabase
        .from("style_list")
        .select("*")
        .eq("status", "active")
        .not("source_id", "is", null)
        .not("garment_type_id", "is", null)
        .gt("sku_count", 0)
        .order("created_at", { ascending: false })
        .limit(1000),
      supabase.rpc("storefront_new_arrivals", { p_candidates: 20, p_limit: 5 }),
    ]);
    if (stylesResult.error) {
      set({ loading: false, loaded: true, error: stylesResult.error.message });
      return;
    }
    const rows = stylesResult.data ?? [];
    // rank by units_sold (most sold = rank 1), matching the old static
    // catalog's "bestseller: smaller = better" convention
    const rankById = new Map(
      [...rows]
        .sort((a, b) => (b.units_sold ?? 0) - (a.units_sold ?? 0))
        .map((r, i) => [r.id, i + 1])
    );
    const arrivalRankById = new Map<string, { rank: number; weeklyUnits: number }>();
    if (!arrivalsResult.error) {
      ((arrivalsResult.data ?? []) as NewArrivalRow[]).forEach((r, i) => {
        arrivalRankById.set(r.style_id, { rank: i + 1, weeklyUnits: r.weekly_units ?? 0 });
      });
    }
    set({
      products: rows.flatMap((r) => mapStyleToProducts(r, rankById.get(r.id!), arrivalRankById.get(r.id!))),
      loading: false,
      loaded: true,
      error: null,
    });
  },
}));

/** Synchronous lookup against whatever is currently cached — call after the
 *  store has loaded (or accept a possible miss while still loading). Falls
 *  back to the first colour of a style for ids saved before the storefront
 *  split products by colour (old cart/wishlist localStorage entries). */
export function productById(id: string): Product | undefined {
  const products = useProducts.getState().products;
  return products.find((p) => p.id === id) ?? products.find((p) => p.id.startsWith(`${id}::`));
}
