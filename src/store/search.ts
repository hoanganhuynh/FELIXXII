import { create } from "zustand";

interface SearchState {
  open: boolean;
  setOpen: (open: boolean) => void;
}

/** Ephemeral UI state only — not persisted, unlike useCart/useBodyProfile. */
export const useSearch = create<SearchState>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}));
