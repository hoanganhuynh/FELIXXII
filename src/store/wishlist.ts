import { create } from "zustand";

interface WishlistState {
  ids: string[];
  userId: string | null;
  init: (userId: string) => void;
  clear: () => void;
  toggle: (id: string) => void;
  has: (id: string) => boolean;
  remove: (id: string) => void;
}

const key = (uid: string) => `sen-wishlist-${uid}`;

const load = (uid: string): string[] => {
  try { return JSON.parse(localStorage.getItem(key(uid)) ?? "[]"); } catch { return []; }
};

const save = (uid: string, ids: string[]) => {
  try { localStorage.setItem(key(uid), JSON.stringify(ids)); } catch { /* ignore */ }
};

export const useWishlist = create<WishlistState>()((set, get) => ({
  ids: [],
  userId: null,

  init: (userId) => set({ ids: load(userId), userId }),

  clear: () => set({ ids: [], userId: null }),

  toggle: (id) =>
    set((s) => {
      const ids = s.ids.includes(id) ? s.ids.filter((x) => x !== id) : [...s.ids, id];
      if (s.userId) save(s.userId, ids);
      return { ids };
    }),

  has: (id) => get().ids.includes(id),

  remove: (id) =>
    set((s) => {
      const ids = s.ids.filter((x) => x !== id);
      if (s.userId) save(s.userId, ids);
      return { ids };
    }),
}));
