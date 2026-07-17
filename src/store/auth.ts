import { create } from "zustand";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

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
    supabase.auth.getSession().then(async ({ data }) => {
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
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
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
