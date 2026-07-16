import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AuthUser {
  name: string;
  email: string;
  phone: string;
}

interface AuthState {
  user: AuthUser | null;
  loginOpen: boolean;
  setLoginOpen: (open: boolean) => void;
  login: (user: AuthUser) => void;
  logout: () => void;
  updateProfile: (data: Partial<AuthUser>) => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      loginOpen: false,
      setLoginOpen: (open) => set({ loginOpen: open }),
      login: (user) => set({ user, loginOpen: false }),
      logout: () => set({ user: null }),
      updateProfile: (data) =>
        set((s) => ({ user: s.user ? { ...s.user, ...data } : null })),
    }),
    { name: "felixxii-auth" }
  )
);
