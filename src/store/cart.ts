import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartLine {
  key: string; // id + size + color
  id: string;
  name: string;
  price: number;
  qty: number;
  size?: string;
  colorName?: string;
  colorHex?: string;
}

interface CartState {
  lines: CartLine[];
  open: boolean;
  add: (line: Omit<CartLine, "qty" | "key">) => void;
  remove: (key: string) => void;
  setQty: (key: string, qty: number) => void;
  setOpen: (open: boolean) => void;
  clear: () => void;
}

const keyOf = (l: Omit<CartLine, "qty" | "key">) => `${l.id}::${l.size ?? ""}::${l.colorName ?? ""}`;

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      open: false,
      add: (line) =>
        set((s) => {
          const key = keyOf(line);
          const existing = s.lines.find((l) => l.key === key);
          const lines = existing
            ? s.lines.map((l) => (l.key === key ? { ...l, qty: l.qty + 1 } : l))
            : [...s.lines, { ...line, key, qty: 1 }];
          return { lines, open: true };
        }),
      remove: (key) => set((s) => ({ lines: s.lines.filter((l) => l.key !== key) })),
      setQty: (key, qty) =>
        set((s) => ({
          lines: s.lines.map((l) => (l.key === key ? { ...l, qty: Math.max(1, qty) } : l)),
        })),
      setOpen: (open) => set({ open }),
      clear: () => set({ lines: [] }),
    }),
    { name: "sen-cart" },
  ),
);

export const cartCount = (lines: CartLine[]) => lines.reduce((n, l) => n + l.qty, 0);
export const cartTotal = (lines: CartLine[]) => lines.reduce((n, l) => n + l.qty * l.price, 0);
