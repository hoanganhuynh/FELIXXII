-- Xoá toàn bộ đơn hàng (order_items trước, rồi orders — order_items có FK tới orders).
-- Chạy trong Supabase Dashboard → SQL Editor.

begin;

delete from public.order_items;
delete from public.orders;

commit;
