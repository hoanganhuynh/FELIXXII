import type { CartLine } from "../store/cart";
import type { CampaignRow } from "../admin/api/campaigns";
import { productStyleId, type Product } from "../data/catalog";

export interface DiscountResult {
  amount: number;
  notes: string[];
}

function matchesScope(campaign: CampaignRow, product: Product | undefined, lineId: string): boolean {
  const styleId = product?.styleId ?? productStyleId(lineId);
  switch (campaign.scope) {
    case "all": return true;
    case "style": return campaign.target_ids.includes(styleId);
    case "category": return !!product && campaign.target_ids.includes(product.category);
    case "garment_type": return !!product && !!product.garmentTypeId && campaign.target_ids.includes(product.garmentTypeId);
    case "source": return !!product && !!product.sourceId && campaign.target_ids.includes(product.sourceId);
    default: return false;
  }
}

function applyDiscount(base: number, kind: CampaignRow["discount_kind"], value: number | null, qty: number = 1): number {
  if (!value || value <= 0) return 0;
  let raw = 0;
  if (kind === "percent") {
    raw = (base * value) / 100;
  } else if (kind === "fixed_price") {
    const unitPrice = base / qty;
    raw = Math.max(0, unitPrice - value) * qty;
  } else {
    raw = value;
  }
  return Math.min(raw, base);
}

/** Computes the total discount + informational notes for the current cart,
 *  stacking every active campaign that applies (no priority/exclusivity —
 *  smallest useful v1 behaviour). Pure function: no side effects, no fetch. */
export function computeCartDiscount(
  lines: CartLine[],
  campaigns: CampaignRow[],
  productsById: Map<string, Product>,
): DiscountResult {
  const subtotal = lines.reduce((n, l) => n + l.qty * l.price, 0);
  let amount = 0;
  const notes: string[] = [];
  const discountedStyles = new Set<string>();

  // Filter campaigns by advanced rules (time, days of week)
  const now = new Date();
  const currentDay = now.getDay() + 1; // 1=Sun, 2=Mon... 7=Sat
  const currentTime = now.toTimeString().slice(0, 8); // "HH:MM:SS"

  const validCampaigns = campaigns.filter((c) => {
    if (c.valid_days && c.valid_days.length > 0) {
      if (!c.valid_days.includes(currentDay)) return false;
    }
    if (c.start_time && currentTime < c.start_time) return false;
    if (c.end_time && currentTime > c.end_time) return false;
    return true;
  });

  // Split campaigns to process item-level first
  const itemCampaigns = validCampaigns.filter((c) => c.type !== "invoice_discount");
  const invoiceCampaigns = validCampaigns.filter((c) => c.type === "invoice_discount");

  for (const c of itemCampaigns) {
    if (c.type === "item_discount") {
      for (const l of lines) {
        if (matchesScope(c, productsById.get(l.id), l.id)) {
          amount += applyDiscount(l.qty * l.price, c.discount_kind, c.discount_value, l.qty);
          discountedStyles.add(l.id);
        }
      }
      continue;
    }

    if (c.type === "buy_x_get_y") {
      const buy = c.buy_qty ?? 0;
      const get = c.get_qty ?? 0;
      if (buy <= 0 || get <= 0) continue;
      const matching = lines.filter((l) => matchesScope(c, productsById.get(l.id), l.id));
      if (!matching.length) continue;
      const totalQty = matching.reduce((n, l) => n + l.qty, 0);
      const freeUnits = Math.floor(totalQty / (buy + get)) * get;
      if (freeUnits > 0) {
        const cheapest = Math.min(...matching.map((l) => l.price));
        amount += freeUnits * cheapest;
        notes.push(`${c.name}: tặng ${freeUnits} sản phẩm`);
        matching.forEach((l) => discountedStyles.add(l.id));
      }
      continue;
    }

    if (c.type === "free_gift") {
      if (subtotal >= (c.min_subtotal ?? 0)) {
        const gift = c.gift_style_id
          ? [...productsById.values()].find((p) => p.styleId === c.gift_style_id)
          : undefined;
        notes.push(`${c.name}: miễn phí ${gift?.name ?? "quà tặng"}`);
        // Free gift doesn't inherently discount cart items, so we don't add to discountedStyles
      }
    }
  }

  for (const c of invoiceCampaigns) {
    let qualifyingSubtotal = subtotal;
    
    if (c.exclude_promotional_items) {
      qualifyingSubtotal = lines
        .filter((l) => !discountedStyles.has(l.id))
        .reduce((n, l) => n + l.qty * l.price, 0);
    }

    if (qualifyingSubtotal >= (c.min_subtotal ?? 0)) {
      amount += applyDiscount(qualifyingSubtotal, c.discount_kind, c.discount_value);
    }
  }

  return { amount: Math.min(amount, subtotal), notes };
}
