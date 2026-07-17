import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/* Resolve the API base.
 *
 * Default = same-origin `/supabase`, proxied by Vite to the local stack
 * (see vite.config.ts). This is what makes a shared tunnel link work: the
 * visitor's browser talks to the origin it loaded the app from, instead of
 * resolving 127.0.0.1 to its own machine and failing.
 *
 * Set VITE_SUPABASE_URL to point straight at a cloud project instead. */
const url = import.meta.env.VITE_SUPABASE_URL || `${window.location.origin}/supabase`;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!anonKey) {
  throw new Error(
    "Missing VITE_SUPABASE_ANON_KEY. Copy .env.example to .env.local, then run `npm run db:start`."
  );
}

/** The anon key is public by design — it ships in the JS bundle to every
 *  visitor. RLS (supabase/migrations/*_rls.sql) is what actually protects the
 *  data. Never put the service_role key in this file. */
export const supabase = createClient<Database>(url, anonKey);
