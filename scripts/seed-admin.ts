/* Creates the local admin user. Uses the service_role key, which is exactly why
   this runs as a SCRIPT and never from the browser.
   Run:  npm run db:admin                                                     */

import { createClient } from "@supabase/supabase-js";
import { execFileSync } from "node:child_process";

// execFileSync (not execSync): args are passed as an array, so nothing is
// interpolated into a shell.
const env = execFileSync("supabase", ["status", "-o", "env"], { encoding: "utf8" });
const pick = (k: string) => env.match(new RegExp(`^${k}="?([^"\\n]+)"?$`, "m"))?.[1] ?? "";

const url = pick("API_URL");
const serviceKey = pick("SERVICE_ROLE_KEY");
if (!url || !serviceKey) {
  console.error("Could not read local Supabase env. Is `supabase start` running?");
  process.exit(1);
}

const EMAIL = "admin@felixxii.local";
const PASSWORD = "admin123456";

const sb = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

const { data: existing } = await sb.auth.admin.listUsers();
const found = existing.users.find((u) => u.email === EMAIL);

if (found) {
  await sb.auth.admin.updateUserById(found.id, {
    app_metadata: { role: "admin" }, // app_metadata is server-only, not self-editable
  });
  console.log(`admin exists — role re-applied: ${EMAIL} / ${PASSWORD}`);
} else {
  const { data, error } = await sb.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
    app_metadata: { role: "admin" },
  });
  if (error) {
    console.error("failed:", error.message);
    process.exit(1);
  }
  console.log(`admin created: ${EMAIL} / ${PASSWORD}  (uid ${data.user.id})`);
}
