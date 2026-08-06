import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

type Customer = {
  id: string;
  name: string;
  email: string;
  orders_count: number;
  ltv: number;
  joined: string;
};

function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq);
    const value = trimmed.slice(eq + 1);
    process.env[key] ??= value;
  }
}

loadEnv();

const url = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
if (!url || !anonKey) throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY");

const sb = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
const { error: authError } = await sb.auth.signInWithPassword({
  email: process.env.ADMIN_EMAIL ?? "admin@felixxii.local",
  password: process.env.ADMIN_PASSWORD ?? "123456",
});
if (authError) throw authError;

const { data: customers, error: customerError } = await sb
  .from("customers")
  .select("id, name, email, orders_count, ltv, joined")
  .order("orders_count", { ascending: false })
  .order("ltv", { ascending: false })
  .order("joined", { ascending: false });
if (customerError) throw customerError;

const allCustomers = (customers ?? []) as Customer[];
const keepIds = new Set(allCustomers.slice(0, 5).map((customer) => customer.id));
const deleteIds = allCustomers.filter((customer) => !keepIds.has(customer.id)).map((customer) => customer.id);

if (deleteIds.length === 0) {
  console.log(`Nothing to delete. Customers already at ${allCustomers.length}.`);
  process.exit(0);
}

const { data: ordersToDelete, error: ordersLookupError } = await sb
  .from("orders")
  .select("id")
  .in("customer_id", deleteIds);
if (ordersLookupError) throw ordersLookupError;

const orderIds = (ordersToDelete ?? []).map((order) => order.id);
if (orderIds.length > 0) {
  const { error: itemsError } = await sb.from("order_items").delete().in("order_id", orderIds);
  if (itemsError) throw itemsError;

  const { error: ordersError } = await sb.from("orders").delete().in("id", orderIds);
  if (ordersError) throw ordersError;
}

const { error: wishlistError } = await sb.from("wishlist").delete().in("customer_id", deleteIds);
if (wishlistError && wishlistError.code !== "42P01") throw wishlistError;

const { error: deleteError } = await sb.from("customers").delete().in("id", deleteIds);
if (deleteError) throw deleteError;

console.log(`Kept ${keepIds.size} customers, deleted ${deleteIds.length} customers and ${orderIds.length} related orders.`);
console.log("Kept:");
for (const customer of allCustomers.filter((item) => keepIds.has(item.id))) {
  console.log(`- ${customer.name} <${customer.email}> (${customer.orders_count} orders, ${customer.ltv} ltv)`);
}
