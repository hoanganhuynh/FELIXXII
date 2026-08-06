import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import { productStyleId } from "../data/catalog";
import { supabase } from "../lib/supabase";
import { useProducts } from "../store/products";

interface PromotionDetail {
  id: string;
  image_url: string;
  title: string;
}

export default function PromotionProducts() {
  const { promotionId } = useParams();
  const products = useProducts((s) => s.products);
  const loaded = useProducts((s) => s.loaded);
  const [promotion, setPromotion] = useState<PromotionDetail | null>(null);
  const [styleIds, setStyleIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    setLoading(true);
    setError(null);

    const load = async () => {
      if (promotionId) {
        const [promotionResult, productsResult] = await Promise.all([
          supabase
            .from("promotions")
            .select("id, image_url, title")
            .eq("id", promotionId)
            .eq("active", true)
            .maybeSingle(),
          supabase
            .from("promotion_products")
            .select("style_id")
            .eq("promotion_id", promotionId)
            .order("sort_order"),
        ]);
        if (promotionResult.error) throw promotionResult.error;
        if (productsResult.error) throw productsResult.error;
        return {
          promotion: promotionResult.data as PromotionDetail | null,
          styleIds: (productsResult.data ?? []).map((row) => row.style_id),
        };
      }

      const promotionsResult = await supabase
        .from("promotions")
        .select("id, image_url, title")
        .eq("active", true)
        .order("sort_order");
      if (promotionsResult.error) throw promotionsResult.error;

      const promos = (promotionsResult.data ?? []) as PromotionDetail[];
      const promoIds = promos.map((promo) => promo.id);
      if (!promoIds.length) return { promotion: null, styleIds: [] };

      const productsResult = await supabase
        .from("promotion_products")
        .select("style_id")
        .in("promotion_id", promoIds)
        .order("sort_order");
      if (productsResult.error) throw productsResult.error;

      return {
        promotion: { id: "all", image_url: promos[0]?.image_url ?? "", title: "Khuyến mãi" },
        styleIds: [...new Set((productsResult.data ?? []).map((row) => row.style_id))],
      };
    };

    load().then((result) => {
      if (!alive) return;
      setPromotion(result.promotion);
      setStyleIds(result.styleIds);
    }).catch((err) => {
      if (!alive) return;
      setError(err instanceof Error ? err.message : String(err));
    }).finally(() => {
      if (alive) setLoading(false);
    });

    return () => { alive = false; };
  }, [promotionId]);

  const list = useMemo(() => {
    const order = new Map(styleIds.map((id, index) => [id, index]));
    return products
      .filter((product) => order.has(productStyleId(product.id)))
      .sort((a, b) => (order.get(productStyleId(a.id)) ?? 0) - (order.get(productStyleId(b.id)) ?? 0));
  }, [products, styleIds]);

  return (
    <div className="pt-[62px]">
      <header className="border-b edge px-5 pb-8 pt-10 md:px-8">
        <div className="mx-auto max-w-[1800px] lg:pl-8">
          <p className="label text-ink-soft">Promotion</p>
          <h1 className="mt-1 font-serif text-3xl md:text-5xl">
            {promotion?.title || "Khuyến mãi"}
            {list.length > 0 && <span className="text-2xl md:text-3xl"> ({list.length})</span>}
          </h1>
        </div>
      </header>

      {promotion?.image_url && (
        <div className="border-b edge">
          <img src={promotion.image_url} alt={promotion.title || "Khuyến mãi"} className="h-auto w-full object-cover" />
        </div>
      )}

      <section className="mx-auto max-w-[1800px] px-5 py-8 md:px-8">
        {loading || !loaded ? (
          <p className="py-24 text-center text-xs text-ink-soft">Đang tải sản phẩm…</p>
        ) : error || (!promotion && Boolean(promotionId)) ? (
          <div className="py-24 text-center">
            <p className="font-serif text-2xl">Không tìm thấy banner khuyến mãi.</p>
            {error && <p className="mt-2 text-xs text-[var(--color-accent)]">{error}</p>}
            <Link to="/shop" className="link-underline mt-5 inline-block text-sm">SHOP ALL</Link>
          </div>
        ) : list.length === 0 ? (
          <div className="py-24 text-center">
            <p className="font-serif text-2xl">
              {promotionId ? "Banner này chưa có sản phẩm." : "Chưa có sản phẩm khuyến mãi."}
            </p>
            <Link to="/shop" className="link-underline mt-5 inline-block text-sm">SHOP ALL</Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
            {list.map((product, index) => (
              <ProductCard key={product.id} item={product} index={index} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
