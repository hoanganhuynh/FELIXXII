/* ============================================================
   FELIXXII — deterministic demo dataset generator
   Seeded so styles / SKUs / orders / customers stay stable
   across reloads. ~480 styles -> ~7,000 variant SKUs.
   ============================================================ */

import {
  PALETTE,
  CATEGORIES,
  COLLECTIONS,
  SILHOUETTES,
  OCCASIONS,
  products as seedProducts,
  type CategoryId,
  type CollectionId,
  type Silhouette,
  type Occasion,
  type ColorSwatch,
} from "../../data/catalog";
import { styleCode, skuCode, barcode } from "./sku";

/* ---------- seeded RNG (mulberry32) ---------- */
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- types ---------- */
export type StyleStatus = "active" | "draft" | "archived";
export type BodyType = "hourglass" | "pear" | "apple" | "rectangle" | "inverted-triangle";

export interface Variant {
  sku: string;
  colorName: string;
  colorHex: string;
  size: string;
  stock: number;
  reserved: number;
  barcode: string;
  priceOverride?: number;
}

export interface Style {
  id: string;
  styleCode: string;
  serial: number;
  name: string;
  category: CategoryId;
  collection: CollectionId;
  silhouette: Silhouette;
  occasion: Occasion;
  price: number;
  material: string;
  bodyType: BodyType;
  status: StyleStatus;
  colors: ColorSwatch[];
  sizes: string[];
  variants: Variant[];
  images?: string[];
  createdAt: string; // ISO date
  unitsSold: number;
  revenue: number;
  views: number;
  returns: number;
}

export interface Order {
  id: string;
  date: string; // ISO
  customerId: string;
  customerName: string;
  channel: "Web" | "Boutique" | "Instagram" | "Wholesale";
  status: "Pending" | "Processing" | "Shipped" | "Delivered" | "Returned" | "Cancelled";
  city: string;
  items: { sku: string; styleName: string; size: string; color: string; qty: number; price: number }[];
  total: number;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  city: string;
  joined: string;
  orders: number;
  ltv: number;
  segment: "VIP" | "Loyal" | "Regular" | "New" | "At-risk";
  bodyType: BodyType;
}

/* ---------- name pools ---------- */
const BASE_NAMES = [
  "Lụa Đêm", "Nguyệt", "Sương Mai", "Hạ Vũ", "Mộc Lan", "Cẩm Tú", "Tơ Vàng", "Thanh Tân",
  "Vân Khê", "Bạch Dương", "Huyền", "Mây Chiều", "Diễm", "Phù Sa", "Liên", "Tuyết",
  "Hồng Ngọc", "Dạ Hương", "Thủy Tiên", "An Nhiên", "Kiều", "Lam", "Tịnh", "Yên",
  "Hạc Cầm", "Vũ Điệu", "Băng Tâm", "Mộng", "Thu Phân", "Xuân Thì", "Lệ Chi", "Ngân Hà",
  "Phượng", "Trầm", "Sen", "Cúc", "Đào", "Mai", "Quỳnh", "Lài",
];
const SUFFIX = ["", " Couture", " Signature", " Édition", " Atelier", " Nocturne", " Lumière", " Reverie"];

const MATERIALS = [
  "Silk satin blend, chiffon lining", "Layered silk tulle, French lace", "Metallic-thread brocade",
  "Corded velvet", "Crystal-embellished lace", "Silk chiffon", "Woven tweed", "Duchess satin",
  "Hand-beaded silk", "Crêpe de chine", "Organza overlay", "Mikado silk",
];
const CITIES = ["Hồ Chí Minh", "Hà Nội", "Đà Nẵng", "Cần Thơ", "Hải Phòng", "Nha Trang", "Huế", "Biên Hòa"];
const FIRST = ["Linh", "Anh", "Trang", "Hà", "Ngọc", "Mai", "Thu", "Vy", "My", "Nhi", "Quỳnh", "Chi", "Hương", "Lan", "Thảo", "Yến"];
const LAST = ["Nguyễn", "Trần", "Lê", "Phạm", "Huỳnh", "Hoàng", "Vũ", "Đặng", "Bùi", "Đỗ", "Ngô", "Dương"];
const BODY_TYPES: BodyType[] = ["hourglass", "pear", "apple", "rectangle", "inverted-triangle"];

const COLOR_KEYS = Object.keys(PALETTE);
const ALL_SIZES = ["XS", "S", "M", "L", "XL", "2XL", "Custom"];

/* real seed photos — spread the 10 real designs across a handful of styles */
const REAL_IMAGE_SETS = seedProducts.filter((p) => p.images?.length).map((p) => p.images!);

function pick<T>(rand: () => number, arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}
function pickSome<T>(rand: () => number, arr: T[], min: number, max: number): T[] {
  const n = min + Math.floor(rand() * (max - min + 1));
  const pool = [...arr];
  const out: T[] = [];
  for (let i = 0; i < n && pool.length; i++) out.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
  return out;
}
function round(n: number, step: number) {
  return Math.round(n / step) * step;
}

/* ---------- generate styles + SKUs ---------- */
export function generateDataset(seed = 20260716) {
  const rand = mulberry32(seed);
  const styles: Style[] = [];
  const serialByCat: Record<CategoryId, number> = {
    "dam-da-hoi": 0, "dam-bridal": 0, ao: 0, set: 0, "phu-kien": 0,
  };

  const TARGET_SKUS = 7000;
  let skuCount = 0;
  let idx = 0;

  while (skuCount < TARGET_SKUS) {
    const category = pick(rand, CATEGORIES).id;
    const serial = ++serialByCat[category];
    const collection = pick(rand, COLLECTIONS).id;
    const silhouette = pick(rand, SILHOUETTES).id;
    const occasion: Occasion =
      category === "dam-bridal" ? "bridal" : pick(rand, OCCASIONS).id;

    const colorKeys = pickSome(rand, COLOR_KEYS, 2, 4);
    const colors = colorKeys.map((k) => PALETTE[k]);
    let sizes = pickSome(rand, ["XS", "S", "M", "L", "XL", "2XL"], 3, 6).sort(
      (a, b) => ALL_SIZES.indexOf(a) - ALL_SIZES.indexOf(b)
    );
    if (category === "dam-bridal" && rand() > 0.4) sizes = [...sizes, "Custom"];

    const basePrice =
      category === "dam-bridal"
        ? round(6_000_000 + rand() * 9_000_000, 100_000)
        : category === "phu-kien"
          ? round(400_000 + rand() * 2_000_000, 50_000)
          : round(1_500_000 + rand() * 5_000_000, 50_000);

    const status: StyleStatus =
      rand() > 0.9 ? "draft" : rand() > 0.92 ? "archived" : "active";

    const name =
      pick(rand, BASE_NAMES) + pick(rand, SUFFIX) + (rand() > 0.6 ? ` ${String.fromCharCode(65 + (idx % 5))}${(serial % 90) + 10}` : "");

    // variants (colour × size)
    const variants: Variant[] = [];
    colors.forEach((col, ci) => {
      sizes.forEach((sz, si) => {
        const stock = Math.floor(rand() * 60);
        variants.push({
          sku: skuCode(category, serial, col.name, sz),
          colorName: col.name,
          colorHex: col.hex,
          size: sz,
          stock,
          reserved: Math.floor(rand() * Math.min(stock, 5)),
          barcode: barcode(serial, ci, si),
          priceOverride: rand() > 0.94 ? round(basePrice * (0.8 + rand() * 0.4), 50_000) : undefined,
        });
      });
    });
    skuCount += variants.length;

    // sales telemetry
    const unitsSold = Math.floor(rand() * rand() * 900);
    const year = rand() > 0.5 ? 2025 : 2026;
    const month = 1 + Math.floor(rand() * (year === 2026 ? 7 : 12));
    const day = 1 + Math.floor(rand() * 27);

    styles.push({
      id: `sty-${category}-${serial}`,
      styleCode: styleCode(category, serial),
      serial,
      name,
      category,
      collection,
      silhouette,
      occasion,
      price: basePrice,
      material: pick(rand, MATERIALS),
      bodyType: pick(rand, BODY_TYPES),
      status,
      colors,
      sizes,
      variants,
      images: rand() > 0.82 ? pick(rand, REAL_IMAGE_SETS) : undefined,
      createdAt: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      unitsSold,
      revenue: unitsSold * basePrice,
      views: unitsSold * (8 + Math.floor(rand() * 40)) + Math.floor(rand() * 500),
      returns: Math.floor(unitsSold * rand() * 0.08),
    });
    idx++;
  }

  /* ---------- customers ---------- */
  const customers: Customer[] = [];
  const CUST_N = 150;
  for (let i = 0; i < CUST_N; i++) {
    const name = `${pick(rand, LAST)} ${pick(rand, FIRST)}`;
    const orders = 1 + Math.floor(rand() * rand() * 22);
    const ltv = round(orders * (2_000_000 + rand() * 6_000_000), 10_000);
    const segment: Customer["segment"] =
      ltv > 60_000_000 ? "VIP" : orders > 6 ? "Loyal" : orders <= 1 ? "New" : rand() > 0.85 ? "At-risk" : "Regular";
    customers.push({
      id: `cus-${1000 + i}`,
      name,
      email: `${name.split(" ").pop()!.toLowerCase()}${i}@email.com`,
      city: pick(rand, CITIES),
      joined: `${rand() > 0.5 ? 2024 : 2025}-${String(1 + Math.floor(rand() * 12)).padStart(2, "0")}-${String(1 + Math.floor(rand() * 27)).padStart(2, "0")}`,
      orders,
      ltv,
      segment,
      bodyType: pick(rand, BODY_TYPES),
    });
  }

  /* ---------- orders ---------- */
  const activeStyles = styles.filter((s) => s.status === "active");
  const orders: Order[] = [];
  const ORDER_N = 220;
  const STATUSES: Order["status"][] = ["Pending", "Processing", "Shipped", "Delivered", "Delivered", "Delivered", "Returned", "Cancelled"];
  const CHANNELS: Order["channel"][] = ["Web", "Web", "Web", "Boutique", "Instagram", "Wholesale"];
  for (let i = 0; i < ORDER_N; i++) {
    const cust = pick(rand, customers);
    const nItems = 1 + Math.floor(rand() * 3);
    const items: Order["items"] = [];
    let total = 0;
    for (let j = 0; j < nItems; j++) {
      const st = pick(rand, activeStyles);
      const v = pick(rand, st.variants);
      const qty = 1 + Math.floor(rand() * 2);
      const price = v.priceOverride ?? st.price;
      total += price * qty;
      items.push({ sku: v.sku, styleName: st.name, size: v.size, color: v.colorName, qty, price });
    }
    const year = rand() > 0.35 ? 2026 : 2025;
    const month = year === 2026 ? 1 + Math.floor(rand() * 7) : 7 + Math.floor(rand() * 6);
    const day = 1 + Math.floor(rand() * 27);
    orders.push({
      id: `FX-${year}-${String(1000 + i).slice(1)}`,
      date: `${year}-${String(Math.min(month, 12)).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      customerId: cust.id,
      customerName: cust.name,
      channel: pick(rand, CHANNELS),
      status: pick(rand, STATUSES),
      city: cust.city,
      items,
      total,
    });
  }
  orders.sort((a, b) => (a.date < b.date ? 1 : -1));

  return { styles, customers, orders, skuCount };
}

export type Dataset = ReturnType<typeof generateDataset>;
