import * as fs from 'fs';
import * as path from 'path';

const catalogPath = './src/data/catalog.ts';
let content = fs.readFileSync(catalogPath, 'utf8');

// Replace bodyType, material, care, blurb, detail
content = content.replace(/Tôn dáng thẳng & mảnh; phom slip buông rũ tự nhiên\./g, 'Flatters straight & slim figures; natural draping slip silhouette.');
content = content.replace(/Lụa tổng hợp mát/g, 'Cool synthetic silk');
content = content.replace(/"Giặt tay nước lạnh", "Phơi bóng râm"/g, '"Hand wash cold", "Dry in shade"');
content = content.replace(/Slip dress cổ yếm buông rũ, satin hồng phấn — mặc dạo phố hay tiệc nhẹ đều hợp\./g, 'Halter neck slip dress, baby pink satin — perfect for casual wear or light parties.');

content = content.replace(/Hợp dáng táo & tròn; wrap chéo tạo eo, cân đối vai\./g, 'Flatters apple & round figures; cross wrap creates a waist, balances shoulders.');
content = content.replace(/Nhung tăm mềm/g, 'Soft corduroy velvet');
content = content.replace(/"Giặt khô", "Không ủi trực tiếp lên nhung"/g, '"Dry clean", "Do not iron directly on velvet"');
content = content.replace(/Đầm satin đỏ đô, tay bồng nhẹ tạo phom vai — sắc rượu vang đặc trưng mùa lạnh\./g, 'Bordeaux satin dress, slightly puffed sleeves to shape shoulders — the signature wine color of the cold season.');

content = content.replace(/Hợp mọi dáng; cổ wrap tôn xương quai xanh\./g, 'Flatters all figures; wrap neck highlights collarbones.');
content = content.replace(/Voan lụa/g, 'Silk chiffon');
content = content.replace(/"Giặt tay", "Ủi hơi nhiệt thấp"/g, '"Hand wash", "Steam iron low heat"');
content = content.replace(/Áo wrap cổ chéo, chất voan lụa nhẹ — layer cùng chân váy hoặc quần âu\./g, 'Cross wrap top, lightweight silk chiffon — layer with skirts or trousers.');

content = content.replace(/Hợp dáng thẳng; áo croptop \+ chân váy midi cân đối tỉ lệ\./g, 'Flatters straight figures; crop top + midi skirt balances proportions.');
content = content.replace(/Tweed dệt/g, 'Woven tweed');
content = content.replace(/"Giặt khô", "Ủi nhiệt trung bình"/g, '"Dry clean", "Iron medium heat"');
content = content.replace(/Set tweed hai mảnh: croptop \+ chân váy midi — thanh lịch công sở tới tiệc\./g, 'Two-piece tweed set: crop top + midi skirt — elegant from office to party.');

content = content.replace(/Tôn vai & eo nhỏ; corset kết hợp chân váy xoè lớn\./g, 'Highlights shoulders & small waist; corset combined with large flared skirt.');
content = content.replace(/Gấm dệt kim tuyến/g, 'Brocade woven with metallic threads');
content = content.replace(/"Chỉ giặt khô", "Treo bảo quản"/g, '"Dry clean only", "Hang to store"');
content = content.replace(/Đầm gấm ball-gown ánh kim — tuyên ngôn cho thảm đỏ và dạ tiệc lớn\./g, 'Metallic ball-gown brocade dress — a statement for the red carpet and grand banquets.');

content = content.replace(/Hợp mọi dáng; A-line thanh thoát, tôn chiều cao\./g, 'Flatters all figures; elegant A-line, adds height.');
content = content.replace(/Tơ tằm, đính hạt thủ công/g, 'Silk, hand-beaded');
content = content.replace(/"Chỉ giặt khô chuyên dụng", "Bọc bảo quản"/g, '"Specialized dry clean only", "Cover to store"');
content = content.replace(/Đầm cưới satin champagne, cổ V xẻ, thân bias buông mềm — nhẹ nhàng cho lễ sân vườn\./g, 'Champagne satin wedding dress, plunging V-neck, soft bias-cut body — gentle for garden ceremonies.');

content = content.replace(/Tôn dáng đồng hồ cát; mermaid ôm body, xoè đuôi cá\./g, 'Flatters hourglass figures; body-hugging mermaid, flared fishtail.');
content = content.replace(/Ren đính pha lê/g, 'Crystal-embellished lace');
content = content.replace(/"Chỉ giặt khô chuyên dụng"/g, '"Specialized dry clean only"');
content = content.replace(/Đầm cưới mermaid ngà, thân dún ly xếp nếp thủ công, chân váy xoè đuôi cá — quyến rũ cho tiệc tối\./g, 'Ivory mermaid wedding dress, hand-pleated ruched body, flared fishtail skirt — glamorous for evening parties.');

content = content.replace(/Pendant dài, mặt ngọc trai/g, 'Long pendant, pearl face');
content = content.replace(/Chuỗi layer nhiều tầng/g, 'Multi-layered chain');
content = content.replace(/Drop earrings dáng giọt nước/g, 'Teardrop earrings');
content = content.replace(/Huggie ôm vành tai, nhỏ gọn/g, 'Ear-hugging huggies, compact');
content = content.replace(/Delicate, bản mảnh tinh tế/g, 'Delicate, sophisticated thin band');
content = content.replace(/Statement cuff bản lớn/g, 'Large statement cuff');
content = content.replace(/Clutch dạ tiệc, khoá kim loại/g, 'Evening clutch, metal clasp');
content = content.replace(/Mini bag da, quai xích/g, 'Leather mini bag, chain strap');
content = content.replace(/Block heel nhung, gót vuông 7cm/g, 'Velvet block heel, 7cm square heel');
content = content.replace(/Mule satin mũi nhọn/g, 'Pointed-toe satin mule');
content = content.replace(/Sandal quai mảnh, gót nhọn/g, 'Thin-strap sandal, stiletto heel');

fs.writeFileSync(catalogPath, content, 'utf8');
console.log('Done translating strings in catalog.ts');
