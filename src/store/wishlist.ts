import { create } from "zustand";
import { persist } from "zustand/middleware";

interface WishlistState {
  ids: string[];
  toggle: (id: string) => void;
  has: (id: string) => boolean;
  remove: (id: string) => void;
}

export const useWishlist = create<WishlistState>()(
  persist(
    (set, get) => ({
      ids: [],
      toggle: (id) =>
        set((s) => ({
          ids: s.ids.includes(id) ? s.ids.filter((x) => x !== id) : [...s.ids, id],
        })),
      has: (id) => get().ids.includes(id),
      remove: (id) => set((s) => ({ ids: s.ids.filter((x) => x !== id) })),
    }),
    { name: "sen-wishlist" },
  ),
);
