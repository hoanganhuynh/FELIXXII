import { create } from "zustand";
import type { AuthError, Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

/** Wipe every Supabase session key plus the legacy demo-store key.
 *  A session written by an earlier database generation (each `supabase db
 *  reset` recreates auth.users with new ids) carries a refresh token GoTrue
 *  rejects, which wedges the client. */
export function purgeAuthStorage() {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith("sb-") || k === "felixxii-auth")
      .forEach((k) => localStorage.removeItem(k));
  } catch { /* private mode / storage disabled */ }
}

/** "Bad request" alone is undiagnosable — keep the status and code. */
function describe(e: AuthError): string {
  const bits = [e.status && `HTTP ${e.status}`, e.code].filter(Boolean).join(", ");
  return bits ? `${e.message} (${bits})` : e.message;
}

export interface Profile {
  name: string;
  email: string;
  phone: string;
}

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isAdmin: boolean;
  ready: boolean; // false until the initial session check resolves
  loginOpen: boolean;

  setLoginOpen: (open: boolean) => void;
  init: () => () => void;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name: string) => Promise<void>;
  signInWithOAuth: (provider: "google" | "facebook") => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (patch: Partial<Profile>) => Promise<void>;
}

/** the admin role lives in app_metadata — users cannot edit their own */
const adminOf = (u: User | null) => u?.app_metadata?.role === "admin";

async function loadProfile(user: User | null): Promise<Profile | null> {
  if (!user) return null;
  const { data } = await supabase
    .from("customers")
    .select("name, email, phone")
    .eq("user_id", user.id)
    .maybeSingle();
  return data
    ? { name: data.name, email: data.email, phone: data.phone ?? "" }
    : { name: user.email?.split("@")[0] ?? "", email: user.email ?? "", phone: "" };
}

export const useAuth = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  isAdmin: false,
  ready: false,
  loginOpen: false,

  setLoginOpen: (open) => set({ loginOpen: open }),

  /** Call once on mount. Returns an unsubscribe fn. */
  init: () => {
    // Legacy key from the pre-Supabase demo store. Harmless but confusing in
    // devtools, and it holds a fake user — drop it on sight.
    try { localStorage.removeItem("felixxii-auth"); } catch { /* ignore */ }

    supabase.auth.getSession().then(async ({ data, error }) => {
      if (error) {
        // A session left over from an earlier database generation (e.g. after
        // `supabase db reset` wiped auth.users) has a refresh token GoTrue no
        // longer knows. supabase-js retries it and every later call reports
        // that 400 instead of its own result — which surfaces as "Bad request"
        // on the login form. Drop the dead session instead of staying wedged.
        await supabase.auth.signOut({ scope: "local" }).catch(() => {});
        set({ session: null, user: null, profile: null, isAdmin: false, ready: true });
        return;
      }
      const user = data.session?.user ?? null;
      set({
        session: data.session,
        user,
        isAdmin: adminOf(user),
        profile: await loadProfile(user),
        ready: true,
      });
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, session) => {
      const user = session?.user ?? null;
      set({
        session,
        user,
        isAdmin: adminOf(user),
        profile: await loadProfile(user),
        ready: true,
      });
    });
    return () => sub.subscription.unsubscribe();
  },

  signInWithEmail: async (email, password) => {
    // Clear any dead session first. Without this, a stale refresh token makes
    // signInWithPassword report the refresh 400 ("Bad request") rather than
    // actually attempting the sign-in. Local scope: never touches the server.
    await supabase.auth.signOut({ scope: "local" }).catch(() => {});

    let { error } = await supabase.auth.signInWithPassword({ email, password });

    // A client wedged by a bad token can still answer with the stale error
    // instead of this attempt's result. Purge hard and give it exactly one
    // more go before believing the failure.
    if (error) {
      purgeAuthStorage();
      ({ error } = await supabase.auth.signInWithPassword({ email, password }));
    }
    if (error) throw new Error(describe(error));
    set({ loginOpen: false });
  },

  signUpWithEmail: async (email, password, name) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } }, // read by the handle_new_user trigger
    });
    if (error) throw error;
    set({ loginOpen: false });
  },

  signInWithOAuth: async (provider) => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/account` },
    });
    if (error) throw error;
  },

  logout: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null, profile: null, isAdmin: false });
  },

  updateProfile: async (patch) => {
    const { user, profile } = get();
    if (!user) return;
    const { error } = await supabase.from("customers").update(patch).eq("user_id", user.id);
    if (error) throw error;
    set({ profile: { ...(profile ?? { name: "", email: "", phone: "" }), ...patch } });
  },
}));
