-- Tạo/chuẩn hoá 2 bảng size: "Váy" (standard/mặc định) và "Đầm".
-- Chạy trong Supabase Dashboard → SQL Editor.
--
-- Lưu ý: template mặc định cũ ("Size Standard") được insert lúc tạo bảng
-- size_templates với format JSON khác (bust_min/bust_max phẳng) so với
-- format {columns, rows} mà trang admin Size Templates hiện đọc — nên mở
-- lên sẽ thấy bảng trống. Script này sửa lại đúng format cho nó (đổi tên
-- thành "Size Chuẩn - Váy") và thêm mới bảng "Size - Đầm" với cùng số đo
-- tham khảo trong ảnh (chỉnh lại số liệu sau trong trang admin nếu cần).

begin;

update public.size_templates
set
  name = 'Size Chuẩn - Váy',
  data = '{
    "columns": ["Vòng Ngực (cm)", "Vòng Eo (cm)", "Vòng Mông (cm)"],
    "rows": [
      {"size": "S",  "measurements": [{"min": 78, "max": 84},  {"min": 60, "max": 66}, {"min": 84,  "max": 90}]},
      {"size": "M",  "measurements": [{"min": 85, "max": 90},  {"min": 67, "max": 72}, {"min": 91,  "max": 96}]},
      {"size": "L",  "measurements": [{"min": 91, "max": 97},  {"min": 73, "max": 79}, {"min": 97,  "max": 103}]},
      {"size": "XL", "measurements": [{"min": 98, "max": 104}, {"min": 80, "max": 86}, {"min": 104, "max": 110}]}
    ]
  }'::jsonb
where is_default = true;

insert into public.size_templates (name, is_default, data) values (
  'Size - Đầm',
  false,
  '{
    "columns": ["Vòng Ngực (cm)", "Vòng Eo (cm)", "Vòng Mông (cm)"],
    "rows": [
      {"size": "S",  "measurements": [{"min": 78, "max": 84},  {"min": 60, "max": 66}, {"min": 84,  "max": 90}]},
      {"size": "M",  "measurements": [{"min": 85, "max": 90},  {"min": 67, "max": 72}, {"min": 91,  "max": 96}]},
      {"size": "L",  "measurements": [{"min": 91, "max": 97},  {"min": 73, "max": 79}, {"min": 97,  "max": 103}]},
      {"size": "XL", "measurements": [{"min": 98, "max": 104}, {"min": 80, "max": 86}, {"min": 104, "max": 110}]}
    ]
  }'::jsonb
);

commit;
