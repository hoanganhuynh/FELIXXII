/* Seeds the demo accounts. Uses the service_role key.
   Run:  SUPABASE_URL=... SUPABASE_SERVICE_KEY=... npx tsx scripts/seed-users.ts
   Or set the vars in .env.local and run: npm run db:users                    */

import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL ?? "https://zlhgiqzvfeegqmokmfhb.supabase.co";
const serviceKey = process.env.SUPABASE_SERVICE_KEY ?? "";

if (!url || !serviceKey) {
  console.error(
    "Missing credentials.\n" +
    "Set SUPABASE_URL and SUPABASE_SERVICE_KEY:\n" +
    "  SUPABASE_SERVICE_KEY=<service_role key from dashboard> npx tsx scripts/seed-users.ts"
  );
  process.exit(1);
}

const sb = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

const USERS = [
  { email: "admin@felixxii.local", password: "123456", name: "Admin", role: "admin" },
  { email: "user@gmail.com", password: "123456", name: "Demo User", role: null },
  { email: "user1@gmail.com", password: "user1", name: "User 1", role: null },
];

const { data: existing } = await sb.auth.admin.listUsers();

for (const u of USERS) {
  const found = existing.users.find((x) => x.email === u.email);
  const app_metadata = u.role ? { role: u.role } : {};

  if (found) {
    const { error } = await sb.auth.admin.updateUserById(found.id, { password: u.password, app_metadata });
    if (error) {
      console.error(`failed ${u.email}:`, error.message);
      process.exit(1);
    }
    console.log(`updated  ${u.email} / ${u.password}${u.role ? `  (${u.role})` : ""}`);
  } else {
    const { error } = await sb.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      app_metadata,
      user_metadata: { full_name: u.name },
    });
    if (error) {
      console.error(`failed ${u.email}:`, error.message);
      process.exit(1);
    }
    console.log(`created  ${u.email} / ${u.password}${u.role ? `  (${u.role})` : ""}`);
  }
}
