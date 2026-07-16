/* ============================================================
   Admin in-memory data store (demo).
   Dataset is generated deterministically on first load; CRUD +
   bulk edits mutate the in-memory copy for the session.
   (Not persisted — 7k SKUs exceed localStorage comfort; a real
    build would back this with the API / Elasticsearch.)
   ============================================================ */

import { create } from "zustand";
import { generateDataset, type Style, type Order, type Customer, type StyleStatus, type BodyType } from "../data/generate";
import type { CategoryId, CollectionId } from "../../data/catalog";

const seed = generateDataset();

/* ---- size rules per body type (editable) ---- */
export interface SizeRuleRow {
  size: string;
  bust: [number, number];
  waist: [number, number];
  hip: [number, number];
}
export interface BodyRule {
  bodyType: BodyType;
  label: string;
  guidance: string;
  /** ease preference: how the fit is biased for this body shape */
  easeNote: string;
  chart: SizeRuleRow[];
}

const BASE_CHART: SizeRuleRow[] = [
  { size: "XS", bust: [76, 80], waist: [58, 62], hip: [82, 86] },
  { size: "S", bust: [81, 85], waist: [63, 67], hip: [87, 91] },
  { size: "M", bust: [86, 90], waist: [68, 72], hip: [92, 96] },
  { size: "L", bust: [91, 96], waist: [73, 78], hip: [97, 102] },
  { size: "XL", bust: [97, 103], waist: [79, 85], hip: [103, 109] },
  { size: "2XL", bust: [104, 110], waist: [86, 92], hip: [110, 116] },
];

const DEFAULT_RULES: BodyRule[] = [
  { bodyType: "hourglass", label: "Hourglass", guidance: "Balanced bust & hip with a defined waist.", easeNote: "Size to the bust; nip the waist. Mermaid & bias cuts shine.", chart: BASE_CHART },
  { bodyType: "pear", label: "Pear", guidance: "Hip wider than bust.", easeNote: "Size to the hip, then tailor the bodice down 1 size.", chart: BASE_CHART },
  { bodyType: "apple", label: "Apple", guidance: "Fuller midsection, slimmer legs.", easeNote: "Size to the bust; empire & wrap release the waist.", chart: BASE_CHART },
  { bodyType: "rectangle", label: "Rectangle", guidance: "Bust, waist, hip fairly even.", easeNote: "Size to the bust; ruching & belts add curve.", chart: BASE_CHART },
  { bodyType: "inverted-triangle", label: "Inverted triangle", guidance: "Shoulder/bust wider than hip.", easeNote: "Size to the bust; A-line & ball-gown balance the hip.", chart: BASE_CHART },
];

interface AdminState {
  styles: Style[];
  orders: Order[];
  customers: Customer[];
  rules: BodyRule[];
  skuCount: number;

  // style CRUD
  addStyle: (s: Style) => void;
  updateStyle: (id: string, patch: Partial<Style>) => void;
  deleteStyle: (id: string) => void;
  duplicateStyle: (id: string) => void;

  // bulk
  bulkUpdate: (ids: string[], patch: BulkPatch) => number;

  // orders
  setOrderStatus: (id: string, status: Order["status"]) => void;

  // size rules
  updateRule: (bodyType: BodyType, chart: SizeRuleRow[]) => void;
}

export interface BulkPatch {
  attribute: "status" | "collection" | "category" | "pricePct" | "priceSet";
  value: string | number;
}

export const useAdmin = create<AdminState>((set) => ({
  styles: seed.styles,
  orders: seed.orders,
  customers: seed.customers,
  rules: DEFAULT_RULES,
  skuCount: seed.skuCount,

  addStyle: (s) => set((st) => ({ styles: [s, ...st.styles] })),
  updateStyle: (id, patch) =>
    set((st) => ({ styles: st.styles.map((s) => (s.id === id ? { ...s, ...patch } : s)) })),
  deleteStyle: (id) => set((st) => ({ styles: st.styles.filter((s) => s.id !== id) })),
  duplicateStyle: (id) =>
    set((st) => {
      const src = st.styles.find((s) => s.id === id);
      if (!src) return {};
      const copy: Style = {
        ...src,
        id: `${src.id}-copy-${Date.now()}`,
        name: `${src.name} (copy)`,
        status: "draft",
      };
      return { styles: [copy, ...st.styles] };
    }),

  bulkUpdate: (ids, patch) => {
    const idSet = new Set(ids);
    let changed = 0;
    set((st) => ({
      styles: st.styles.map((s) => {
        if (!idSet.has(s.id)) return s;
        changed++;
        switch (patch.attribute) {
          case "status":
            return { ...s, status: patch.value as StyleStatus };
          case "collection":
            return { ...s, collection: patch.value as CollectionId };
          case "category":
            return { ...s, category: patch.value as CategoryId };
          case "priceSet":
            return { ...s, price: Number(patch.value) };
          case "pricePct": {
            const factor = 1 + Number(patch.value) / 100;
            return { ...s, price: Math.round((s.price * factor) / 50_000) * 50_000 };
          }
          default:
            return s;
        }
      }),
    }));
    return changed;
  },

  setOrderStatus: (id, status) =>
    set((st) => ({ orders: st.orders.map((o) => (o.id === id ? { ...o, status } : o)) })),

  updateRule: (bodyType, chart) =>
    set((st) => ({ rules: st.rules.map((r) => (r.bodyType === bodyType ? { ...r, chart } : r)) })),
}));

/* ---- derived selectors (computed in components with useMemo) ---- */
export function totalStock(s: Style): number {
  return s.variants.reduce((n, v) => n + v.stock, 0);
}
export function skuOf(s: Style): number {
  return s.variants.length;
}
