/* Seeds the demo accounts. Uses the service_role key, which is exactly why
   this runs as a SCRIPT and never from the browser.
   Run:  npm run db:users                                                    */

import { createClient } from "@supabase/supabase-js";
import { execFileSync } from "node:child_process";

// execFileSync (not execSync): args go as an array, nothing hits a shell.
const env = execFileSync("supabase", ["status", "-o", "env"], { encoding: "utf8" });
const pick = (k: string) => env.match(new RegExp(`^${k}="?([^"\\n]+)"?$`, "m"))?.[1] ?? "";

const url = pick("API_URL");
const serviceKey = pick("SERVICE_ROLE_KEY");
if (!url || !serviceKey) {
  console.error("Could not read local Supabase env. Is `supabase start` running?");
  process.exit(1);
}

const sb = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

/** Supabase Auth keys on email, so the "admin" username maps to this address.
 *  LoginDrawer appends the domain when the input has no "@". */
const USERS = [
  { email: "admin@felixxii.local", password: "123456", name: "Admin", role: "admin" },
  { email: "user@gmail.com", password: "123456", name: "Demo User", role: null },
];

const { data: existing } = await sb.auth.admin.listUsers();

for (const u of USERS) {
  const found = existing.users.find((x) => x.email === u.email);
  const app_metadata = u.role ? { role: u.role } : {};

  if (found) {
    // keep the password and role in sync with this file on every run
    await sb.auth.admin.updateUserById(found.id, { password: u.password, app_metadata });
    console.log(`updated  ${u.email} / ${u.password}${u.role ? `  (${u.role})` : ""}`);
  } else {
    const { error } = await sb.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      app_metadata,                       // server-only; users cannot self-edit
      user_metadata: { full_name: u.name }, // read by handle_new_user()
    });
    if (error) {
      console.error(`failed ${u.email}:`, error.message);
      process.exit(1);
    }
    console.log(`created  ${u.email} / ${u.password}${u.role ? `  (${u.role})` : ""}`);
  }
}
