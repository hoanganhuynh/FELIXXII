import * as fs from 'fs';
import * as path from 'path';

const catalogPath = './src/data/catalog.ts';
let content = fs.readFileSync(catalogPath, 'utf8');

// Replacements in catalog.ts
content = content.replace(/\{ id: "dam-da-hoi", label: "Đầm Dạ Hội" \}/g, '{ id: "dam-da-hoi", label: "Evening Dresses" }');
content = content.replace(/\{ id: "dam-bridal", label: "Bridal" \}/g, '{ id: "dam-bridal", label: "Bridal" }');
content = content.replace(/\{ id: "ao", label: "Áo" \}/g, '{ id: "ao", label: "Tops" }');
content = content.replace(/\{ id: "quan-vay", label: "Quần & Chân váy" \}/g, '{ id: "quan-vay", label: "Bottoms & Skirts" }');
content = content.replace(/\{ id: "set", label: "Set Đồ" \}/g, '{ id: "set", label: "Sets" }');
content = content.replace(/\{ id: "phu-kien", label: "Phụ kiện" \}/g, '{ id: "phu-kien", label: "Accessories" }');

content = content.replace(/\{ id: "xuan-he-2026", label: "Xuân Hè 26", season: "SS26" \}/g, '{ id: "xuan-he-2026", label: "Spring Summer 26", season: "SS26" }');
content = content.replace(/\{ id: "thu-dong-2025", label: "Thu Đông 25", season: "FW25" \}/g, '{ id: "thu-dong-2025", label: "Fall Winter 25", season: "FW25" }');
content = content.replace(/\{ id: "tinh-hoa", label: "Tinh Hoa \\(Couture\\)" \}/g, '{ id: "tinh-hoa", label: "Tinh Hoa (Couture)" }');

content = content.replace(/den: \{ name: "Đen", hex: "#1A1A1A" \}/g, 'den: { name: "Black", hex: "#1A1A1A" }');
content = content.replace(/be: \{ name: "Be", hex: "#E5DEC5" \}/g, 'be: { name: "Beige", hex: "#E5DEC5" }');
content = content.replace(/ngavoi: \{ name: "Ngà voi", hex: "#F3EFE9" \}/g, 'ngavoi: { name: "Ivory", hex: "#F3EFE9" }');
content = content.replace(/dodo: \{ name: "Đỏ đô", hex: "#7C1F2B" \}/g, 'dodo: { name: "Bordeaux", hex: "#7C1F2B" }');
content = content.replace(/reu: \{ name: "Xanh rêu", hex: "#4A5A3A" \}/g, 'reu: { name: "Olive Green", hex: "#4A5A3A" }');
content = content.replace(/ngoc: \{ name: "Xanh ngọc", hex: "#8CAFA4" \}/g, 'ngoc: { name: "Jade Green", hex: "#8CAFA4" }');
content = content.replace(/hong: \{ name: "Hồng phấn", hex: "#DFB3B4" \}/g, 'hong: { name: "Baby Pink", hex: "#DFB3B4" }');
content = content.replace(/gold: \{ name: "Ánh kim", hex: "#D4AF37" \}/g, 'gold: { name: "Gold", hex: "#D4AF37" }');
content = content.replace(/bac: \{ name: "Ánh bạc", hex: "#C0C0C0" \}/g, 'bac: { name: "Silver", hex: "#C0C0C0" }');

content = content.replace(/\{ id: "a-line", label: "A-Line \\(Chữ A\\)" \}/g, '{ id: "a-line", label: "A-Line" }');
content = content.replace(/\{ id: "mermaid", label: "Đuôi cá" \}/g, '{ id: "mermaid", label: "Mermaid" }');
content = content.replace(/\{ id: "ball-gown", label: "Xoè phồng" \}/g, '{ id: "ball-gown", label: "Ball Gown" }');
content = content.replace(/\{ id: "slip", label: "Slip dress" \}/g, '{ id: "slip", label: "Slip dress" }');
content = content.replace(/\{ id: "wrap", label: "Wrap chéo" \}/g, '{ id: "wrap", label: "Wrap" }');
content = content.replace(/\{ id: "shift", label: "Suông" \}/g, '{ id: "shift", label: "Shift" }');

content = content.replace(/\{ id: "daily", label: "Mặc hàng ngày" \}/g, '{ id: "daily", label: "Daily" }');
content = content.replace(/\{ id: "event", label: "Dạ hội \/ Sự kiện" \}/g, '{ id: "event", label: "Event" }');
content = content.replace(/\{ id: "bridal", label: "Bridal \/ Cưới" \}/g, '{ id: "bridal", label: "Bridal" }');

content = content.replace(/necklace: "Dây chuyền"/g, 'necklace: "Necklace"');
content = content.replace(/earrings: "Bông tai"/g, 'earrings: "Earrings"');
content = content.replace(/bracelet: "Lắc tay"/g, 'bracelet: "Bracelet"');
content = content.replace(/bag: "Túi xách"/g, 'bag: "Bag"');
content = content.replace(/shoes: "Giày"/g, 'shoes: "Shoes"');

fs.writeFileSync(catalogPath, content, 'utf8');
console.log('Done modifying catalog.ts');
