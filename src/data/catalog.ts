/* ============================================================
   SEN — Atelier · catalogue
   Fashion model: Category (loại SP) × Collection (câu chuyện mùa)
   ============================================================ */

export type CategoryId = "dam-da-hoi" | "dam-bridal" | "ao" | "set" | "phu-kien";
export type CollectionId = "thu-dong-2025" | "xuan-he-2026";
export type Silhouette = "a-line" | "mermaid" | "wrap" | "slip" | "ball-gown" | "shift";
export type Occasion = "event" | "daily" | "bridal";
export type AccessoryType = "necklace" | "earrings" | "bracelet" | "bag" | "shoes";

export interface ColorSwatch {
  name: string;
  hex: string;
}

export const CATEGORIES: { id: CategoryId; label: string }[] = [
  { id: "dam-da-hoi", label: "Evening Dresses" },
  { id: "dam-bridal", label: "Bridal" },
  { id: "ao", label: "Tops" },
  { id: "set", label: "Sets" },
  { id: "phu-kien", label: "Accessories" },
];

export const COLLECTIONS: { id: CollectionId; label: string; season: string; note: string; image: string }[] = [
  { id: "thu-dong-2025", label: "Fall — Winter 2025", season: "FW25", note: "Velvet, draped silk, warm dark tones.", image: "607653555_1212322397744958_1993799492838073038_n.jpg" },
  { id: "xuan-he-2026", label: "Spring — Summer 2026", season: "SS26", note: "Lightweight chiffon, pastel, flowy fit.", image: "604770326_1209992451311286_3317825646691052207_n.jpg" },
];

export const SILHOUETTES: { id: Silhouette; label: string }[] = [
  { id: "a-line", label: "A-line" },
  { id: "mermaid", label: "Mermaid" },
  { id: "ball-gown", label: "Ball-gown" },
  { id: "wrap", label: "Wrap" },
  { id: "slip", label: "Slip" },
  { id: "shift", label: "Shift" },
];

export const OCCASIONS: { id: Occasion; label: string }[] = [
  { id: "event", label: "Event" },
  { id: "daily", label: "Daily" },
  { id: "bridal", label: "Bridal" },
];

/** shared swatch palette (dominant-colour tags) */
export const PALETTE: Record<string, ColorSwatch> = {
  den: { name: "Black", hex: "#1a1a1a" },
  ngavoi: { name: "Ivory", hex: "#efe7d6" },
  dodo: { name: "Bordeaux", hex: "#7c1f2b" },
  reu: { name: "Olive Green", hex: "#4a5a3a" },
  hong: { name: "Pastel Pink", hex: "#e6c2cd" },
  be: { name: "Beige", hex: "#d8c3a5" },
  navy: { name: "Navy", hex: "#26314d" },
  gold: { name: "Gold", hex: "#c9a24a" },
  ngoc: { name: "Jade Green", hex: "#2f7d78" },
  bac: { name: "Silver", hex: "#c3c7cc" },
};

export interface Product {
  id: string;
  name: string;
  category: CategoryId;
  collection: CollectionId;
  price: number; // VND
  colors: ColorSwatch[];
  sizes: string[];
  silhouette?: Silhouette;
  occasion: Occasion;
  bodyType: string; // gợi ý dáng người
  care: string[];
  material: string;
  customizable?: boolean; // bridal / đầm chỉnh size
  bestseller?: number; // rank (nhỏ = bán chạy hơn)
  createdAt: number; // để sort "mới nhất"
  blurb: string;
  /** real product photos in /public/product-image-demo (fallback = generated art) */
  images?: string[];
  /** complete-the-look: accessory ids gợi ý theo type */
  look?: Partial<Record<AccessoryType, string[]>>;
}

/** folder holding the real demo product photos */
export const IMG_BASE = "/product-image-demo/";

export interface Accessory {
  id: string;
  name: string;
  type: AccessoryType;
  category: "phu-kien";
  collection: CollectionId;
  price: number;
  colors: ColorSwatch[];
  detail: string; // pendant dài / drop / cuff...
}

const c = (...keys: string[]): ColorSwatch[] => keys.map((k) => PALETTE[k]);

export const products: Product[] = [
  {
    id: "lua-dem",
    name: "Lụa Đêm",
    category: "dam-da-hoi",
    collection: "thu-dong-2025",
    price: 4850000,
    colors: c("dodo", "den", "navy"),
    sizes: ["S", "M", "L", "XL"],
    silhouette: "mermaid",
    occasion: "event",
    bodyType: "Tôn dáng đồng hồ cát & chữ X; ôm eo, xoè nhẹ ở gấu.",
    material: "Lụa satin pha, lót voan",
    care: ["Giặt khô", "Không vắt xoắn", "Ủi hơi mặt trái ở nhiệt thấp"],
    bestseller: 1,
    createdAt: 20250910,
    blurb: "Phom mermaid cổ đổ, chất satin lụa đổ bóng — chiếc đầm dạ hội bán chạy nhất mùa.",
    images: [
      "607653555_1212322397744958_1993799492838073038_n.jpg",
      "605854033_1212322447744953_8385914445294101481_n.jpg",
    ],
    look: { necklace: ["day-ngoc"], earrings: ["bong-giot"], bag: ["clutch-lua"], shoes: ["heel-nhung"] },
  },
  {
    id: "suong-mai",
    name: "Sương Mai",
    category: "dam-bridal",
    collection: "xuan-he-2026",
    price: 12800000,
    colors: c("ngavoi", "be"),
    sizes: ["S", "M", "L", "Custom"],
    silhouette: "ball-gown",
    occasion: "bridal",
    bodyType: "Hợp mọi dáng; corset định phom, chân váy ball-gown che hông.",
    material: "Voan tơ nhiều lớp, ren Pháp",
    care: ["Specialized dry clean only", "Bảo quản treo, bọc vải mềm"],
    customizable: true,
    bestseller: 4,
    createdAt: 20260115,
    blurb: "Đầm cưới cape lụa ngà, viền đính ngọc trai thủ công — có thể chỉnh may theo số đo.",
    images: [
      "604770326_1209992451311286_3317825646691052207_n.jpg",
      "606038369_1209992494644615_3834472852269240134_n.jpg",
      "605744430_1209992551311276_4297429810533013933_n.jpg",
    ],
    look: { earrings: ["huggie-vang"], necklace: ["chain-kim"], shoes: ["mule-satin"] },
  },
  {
    id: "nguyet",
    name: "Nguyệt",
    category: "dam-da-hoi",
    collection: "thu-dong-2025",
    price: 3950000,
    colors: c("navy", "den"),
    sizes: ["S", "M", "L", "XL"],
    silhouette: "mermaid",
    occasion: "event",
    bodyType: "Tôn dáng đồng hồ cát; cổ đổ mềm, thân bias ôm nhẹ theo đường cong.",
    material: "Satin lụa ánh kim",
    care: ["Giặt khô", "Ủi hơi mặt trái, nhiệt thấp"],
    bestseller: 3,
    createdAt: 20250920,
    blurb: "Đầm cổ đổ sắc navy ánh kim, thân bias buông rũ — sang trọng, kín đáo mà cuốn hút.",
    images: [
      "667453997_1300228645620999_7198445231715406264_n.jpg",
      "667405324_1300229082287622_3951756945889064705_n.jpg",
      "668139748_1300226622287868_3536109004282702876_n.jpg",
    ],
    look: { earrings: ["bong-giot"], bracelet: ["lac-manh"], shoes: ["sandal-quai"] },
  },
  {
    id: "ha-vu",
    name: "Hạ Vũ",
    category: "dam-da-hoi",
    collection: "xuan-he-2026",
    price: 2650000,
    colors: c("hong", "be", "ngavoi"),
    sizes: ["S", "M", "L"],
    silhouette: "slip",
    occasion: "daily",
    bodyType: "Flatters straight & slim figures; natural draping slip silhouette.",
    material: "Cool synthetic silk",
    care: ["Hand wash cold", "Dry in shade"],
    bestseller: 2,
    createdAt: 20260210,
    blurb: "Halter neck slip dress, baby pink satin — perfect for casual wear or light parties.",
    images: ["602970875_1205145441795987_18715939281272587_n.jpg"],
    look: { necklace: ["chain-kim"], earrings: ["huggie-vang"], bag: ["mini-da"], shoes: ["mule-satin"] },
  },
  {
    id: "moc-lan",
    name: "Mộc Lan",
    category: "dam-da-hoi",
    collection: "thu-dong-2025",
    price: 4200000,
    colors: c("dodo", "den"),
    sizes: ["S", "M", "L", "XL"],
    silhouette: "wrap",
    occasion: "event",
    bodyType: "Flatters apple & round figures; cross wrap creates a waist, balances shoulders.",
    material: "Soft corduroy velvet",
    care: ["Dry clean", "Do not iron directly on velvet"],
    bestseller: 6,
    createdAt: 20251001,
    blurb: "Bordeaux satin dress, slightly puffed sleeves to shape shoulders — the signature wine color of the cold season.",
    images: ["608204946_1212322411078290_5493282969479296625_n.jpg"],
    look: { necklace: ["day-ngoc"], earrings: ["bong-giot"], bag: ["clutch-lua"], shoes: ["heel-nhung"] },
  },
  {
    id: "sen-ao",
    name: "Áo Sen",
    category: "ao",
    collection: "xuan-he-2026",
    price: 1450000,
    colors: c("ngavoi", "ngoc", "hong"),
    sizes: ["S", "M", "L"],
    silhouette: "wrap",
    occasion: "daily",
    bodyType: "Flatters all figures; wrap neck highlights collarbones.",
    material: "Silk chiffon",
    care: ["Hand wash", "Steam iron low heat"],
    bestseller: 5,
    createdAt: 20260220,
    blurb: "Cross wrap top, lightweight silk chiffon — layer with skirts or trousers.",
    look: { necklace: ["chain-kim"], earrings: ["huggie-vang"], bag: ["mini-da"] },
  },
  {
    id: "vu-khuc",
    name: "Set Vũ Khúc",
    category: "set",
    collection: "thu-dong-2025",
    price: 3300000,
    colors: c("be", "den", "reu"),
    sizes: ["S", "M", "L"],
    silhouette: "shift",
    occasion: "daily",
    bodyType: "Flatters straight figures; crop top + midi skirt balances proportions.",
    material: "Woven tweed",
    care: ["Dry clean", "Iron medium heat"],
    bestseller: 8,
    createdAt: 20251005,
    blurb: "Two-piece tweed set: crop top + midi skirt — elegant from office to party.",
    look: { earrings: ["bong-giot"], bracelet: ["cuff-bac"], bag: ["mini-da"], shoes: ["sandal-quai"] },
  },
  {
    id: "cam-tu",
    name: "Cẩm Tú",
    category: "dam-da-hoi",
    collection: "thu-dong-2025",
    price: 5600000,
    colors: c("gold", "dodo", "den"),
    sizes: ["S", "M", "L", "XL"],
    silhouette: "ball-gown",
    occasion: "event",
    bodyType: "Highlights shoulders & small waist; corset combined with large flared skirt.",
    material: "Brocade woven with metallic threads",
    care: ["Dry clean only", "Hang to store"],
    bestseller: 7,
    createdAt: 20250915,
    blurb: "Metallic ball-gown brocade dress — a statement for the red carpet and grand banquets.",
    look: { necklace: ["day-ngoc"], earrings: ["bong-giot"], bag: ["clutch-lua"], shoes: ["heel-nhung"] },
  },
  {
    id: "to-vang",
    name: "Tơ Vàng",
    category: "dam-bridal",
    collection: "xuan-he-2026",
    price: 9800000,
    colors: c("ngavoi", "gold"),
    sizes: ["S", "M", "L", "Custom"],
    silhouette: "a-line",
    occasion: "bridal",
    bodyType: "Flatters all figures; elegant A-line, adds height.",
    material: "Silk, hand-beaded",
    care: ["Specialized dry clean only", "Cover to store"],
    customizable: true,
    bestseller: 9,
    createdAt: 20260118,
    blurb: "Champagne satin wedding dress, plunging V-neck, soft bias-cut body — gentle for garden ceremonies.",
    images: [
      "604302658_1207684788208719_2584822847566233407_n.jpg",
      "605730417_1207684818208716_3284772005674759256_n.jpg",
    ],
    look: { earrings: ["huggie-vang"], necklace: ["chain-kim"], shoes: ["mule-satin"] },
  },
  {
    id: "thanh-tan",
    name: "Thanh Tân",
    category: "dam-bridal",
    collection: "thu-dong-2025",
    price: 11200000,
    colors: c("ngavoi"),
    sizes: ["S", "M", "L", "Custom"],
    silhouette: "mermaid",
    occasion: "bridal",
    bodyType: "Flatters hourglass figures; body-hugging mermaid, flared fishtail.",
    material: "Crystal-embellished lace",
    care: ["Specialized dry clean only"],
    customizable: true,
    bestseller: 10,
    createdAt: 20251008,
    blurb: "Ivory mermaid wedding dress, hand-pleated ruched body, flared fishtail skirt — glamorous for evening parties.",
    images: [
      "608051236_1212295184414346_1759387043234619556_n.jpg",
      "606001228_1212295194414345_7959480619862527801_n.jpg",
      "608511618_1212295214414343_8768514877154959894_n.jpg",
    ],
    look: { earrings: ["bong-giot"], necklace: ["day-ngoc"], shoes: ["heel-nhung"] },
  },
];

export const accessories: Accessory[] = [
  { id: "day-ngoc", name: "Dây chuyền Ngọc", type: "necklace", category: "phu-kien", collection: "thu-dong-2025", price: 1250000, colors: c("gold", "bac"), detail: "Long pendant, pearl face" },
  { id: "chain-kim", name: "Layered Chain Kim", type: "necklace", category: "phu-kien", collection: "xuan-he-2026", price: 980000, colors: c("gold"), detail: "Multi-layered chain" },
  { id: "bong-giot", name: "Bông tai Giọt", type: "earrings", category: "phu-kien", collection: "thu-dong-2025", price: 650000, colors: c("gold", "bac"), detail: "Teardrop earrings" },
  { id: "huggie-vang", name: "Huggie Vàng", type: "earrings", category: "phu-kien", collection: "xuan-he-2026", price: 520000, colors: c("gold"), detail: "Ear-hugging huggies, compact" },
  { id: "lac-manh", name: "Lắc tay Mảnh", type: "bracelet", category: "phu-kien", collection: "xuan-he-2026", price: 480000, colors: c("gold", "bac"), detail: "Delicate, sophisticated thin band" },
  { id: "cuff-bac", name: "Cuff Bạc", type: "bracelet", category: "phu-kien", collection: "thu-dong-2025", price: 890000, colors: c("bac"), detail: "Large statement cuff" },
  { id: "clutch-lua", name: "Clutch Lụa", type: "bag", category: "phu-kien", collection: "thu-dong-2025", price: 1650000, colors: c("den", "dodo", "gold"), detail: "Evening clutch, metal clasp" },
  { id: "mini-da", name: "Mini Bag Da", type: "bag", category: "phu-kien", collection: "xuan-he-2026", price: 2100000, colors: c("be", "den"), detail: "Leather mini bag, chain strap" },
  { id: "heel-nhung", name: "Block Heel Nhung", type: "shoes", category: "phu-kien", collection: "thu-dong-2025", price: 1980000, colors: c("den", "dodo"), detail: "Velvet block heel, 7cm square heel" },
  { id: "mule-satin", name: "Mule Satin", type: "shoes", category: "phu-kien", collection: "xuan-he-2026", price: 1750000, colors: c("ngavoi", "hong"), detail: "Pointed-toe satin mule" },
  { id: "sandal-quai", name: "Sandal Quai Mảnh", type: "shoes", category: "phu-kien", collection: "xuan-he-2026", price: 1550000, colors: c("be", "den"), detail: "Thin-strap sandal, stiletto heel" },
];

export const LOOK_LABELS: Record<AccessoryType, string> = {
  necklace: "Necklace",
  earrings: "Earrings",
  bracelet: "Bracelet",
  bag: "Bag",
  shoes: "Shoes",
};

export const allItems = [...products, ...accessories];

export function productById(id: string) {
  return products.find((p) => p.id === id);
}
export function accessoryById(id: string) {
  return accessories.find((a) => a.id === id);
}
export function categoryLabel(id: CategoryId) {
  return CATEGORIES.find((x) => x.id === id)?.label ?? id;
}
export function collectionLabel(id: CollectionId) {
  return COLLECTIONS.find((x) => x.id === id)?.label ?? id;
}
