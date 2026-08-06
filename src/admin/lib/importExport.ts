import { supabase } from "../../lib/supabase";
import { read, utils, writeFile } from "xlsx";
import { bulkUpdateVariants, nextStyleCode } from "../api/products";
import { newSkuCode } from "./slug";

export async function exportProductsToXlsx(format: "xlsx" | "csv" = "xlsx") {
  // Fetch all variants joined with styles
  const { data, error } = await supabase
    .from("variants")
    .select(`
      sku,
      color_name,
      size,
      price_override,
      in_stock,
      styles (
        style_code,
        name,
        price
      )
    `)
    .order("sku");

  if (error) throw error;
  if (!data) return;

  const rows = data.map((v: any) => ({
    "SKU": v.sku,
    "Style Code": v.styles?.style_code || "",
    "Product Name": v.styles?.name || "",
    "Color": v.color_name,
    "Size": v.size,
    "Price": v.price_override ?? v.styles?.price ?? 0,
    "In Stock": v.in_stock ? "TRUE" : "FALSE"
  }));

  const ws = utils.json_to_sheet(rows);
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, "Products");
  
  const date = new Date().toISOString().split("T")[0];
  const filename = `products_export_${date}.${format}`;
  
  writeFile(wb, filename);
}

export function downloadSampleFile() {
  const rows = [
    {
      "Product Name": "Áo Lụa Mùa Thu",
      "Category": "Áo",
      "Collection": "Mùa Thu 2026",
      "Color": "Đỏ",
      "Size": "S",
      "Price": "550000",
      "In Stock": "TRUE"
    }
  ];
  const ws = utils.json_to_sheet(rows);
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, "Sample");
  writeFile(wb, "import_sample.xlsx");
}

export async function importProductsFromXlsx(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = read(data, { type: "array" });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = utils.sheet_to_json(worksheet) as any[];
        
        if (!rows || rows.length === 0) {
          throw new Error("File trống hoặc không đúng định dạng.");
        }

        // Fetch categories and collections to map names to IDs
        const { data: categories } = await supabase.from("categories").select("id, label");
        const { data: collections } = await supabase.from("collections").select("id, label");
        
        const catMap = new Map((categories || []).map(c => [c.label.toLowerCase().trim(), c.id]));
        const colMap = new Map((collections || []).map(c => [c.label.toLowerCase().trim(), c.id]));

        // Group rows by Product Name
        const byProduct = new Map<string, any[]>();
        for (const row of rows) {
          const name = row["Product Name"]?.toString().trim();
          if (!name) continue;
          if (!byProduct.has(name)) byProduct.set(name, []);
          byProduct.get(name)!.push(row);
        }

        let processedSkus = 0;

        for (const [name, productRows] of byProduct.entries()) {
          // Check if style exists
          let styleId: string | undefined;
          let styleCode: string | undefined;

          const { data: existingStyles } = await supabase.from("styles").select("id, style_code").eq("name", name).limit(1);
          
          if (existingStyles && existingStyles.length > 0) {
            styleId = existingStyles[0].id;
            styleCode = existingStyles[0].style_code;
          } else {
            // Create new style
            styleCode = await nextStyleCode(name);
            const catName = productRows[0]["Category"]?.toString().toLowerCase().trim();
            const colName = productRows[0]["Collection"]?.toString().toLowerCase().trim();
            
            const category_id = catMap.get(catName) || (categories && categories.length > 0 ? categories[0].id : "");
            const collection_id = colMap.get(colName) || (collections && collections.length > 0 ? collections[0].id : "");
            
            if (!category_id || !collection_id) {
              throw new Error(`Không tìm thấy Danh mục/Bộ sưu tập cho sản phẩm "${name}". Vui lòng kiểm tra lại file.`);
            }

            const { data: maxRow } = await supabase.from("styles").select("serial").eq("category_id", category_id).order("serial", { ascending: false }).limit(1).single();
            const serial = (maxRow?.serial ?? 0) + 1;

            const { data: newStyle, error: styleErr } = await supabase.from("styles").insert({
              style_code: styleCode,
              serial,
              name,
              category_id,
              collection_id,
              status: "draft",
              price: parseInt(productRows[0]["Price"]?.toString().replace(/[^0-9]/g, "") || "0", 10),
            }).select("id").single();

            if (styleErr) throw styleErr;
            styleId = newStyle.id;
          }

          // Process variants
          for (const row of productRows) {
            const color = row["Color"]?.toString().trim();
            const size = row["Size"]?.toString().trim();
            if (!color || !size) continue;

            const sku = newSkuCode(styleCode, color, size);
            const rawInStock = row["In Stock"]?.toString().trim().toUpperCase();
            const inStock = (rawInStock === "TRUE" || rawInStock === "1" || rawInStock === "YES" || rawInStock === "CÓ");
            const priceOverride = row["Price"] ? parseInt(row["Price"].toString().replace(/[^0-9]/g, ""), 10) : null;

            // Check if sku exists
            const { data: existingVariant } = await supabase.from("variants").select("sku").eq("sku", sku).single();

            if (existingVariant) {
              // Update
              await supabase.from("variants").update({
                in_stock: inStock,
                price_override: priceOverride
              }).eq("sku", sku);
            } else {
              // Insert
              // We need color_hex. If color exists, we can fetch it, otherwise just use a default hex.
              const { data: colorData } = await supabase.from("colors").select("hex").eq("name", color).limit(1).single();
              const color_hex = colorData?.hex || "#000000";

              await supabase.from("variants").insert({
                sku,
                style_id: styleId,
                color_name: color,
                color_hex,
                size,
                in_stock: inStock,
                price_override: priceOverride,
                stock: inStock ? 1 : 0
              });
            }
            processedSkus++;
          }
        }
        
        resolve(processedSkus);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}
