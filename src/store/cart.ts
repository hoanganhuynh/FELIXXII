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
  add: (line: Omit<CartLine, "qty" | "key"> & { qty?: number }) => void;
  remove: (key: string) => void;
  setQty: (key: string, qty: number) => void;
  setSize: (key: string, size: string) => void;
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
          const qtyToAdd = line.qty ?? 1;
          const existing = s.lines.find((l) => l.key === key);
          const lines = existing
            ? s.lines.map((l) => (l.key === key ? { ...l, qty: l.qty + qtyToAdd } : l))
            : [...s.lines, { ...line, key, qty: qtyToAdd }];
          return { lines, open: true };
        }),
      remove: (key) => set((s) => ({ lines: s.lines.filter((l) => l.key !== key) })),
      setQty: (key, qty) =>
        set((s) => ({
          lines: s.lines.map((l) => (l.key === key ? { ...l, qty: Math.max(1, qty) } : l)),
        })),
      setSize: (key, size) =>
        set((s) => {
          const line = s.lines.find((l) => l.key === key);
          if (!line) return s;
          const newKey = keyOf({ ...line, size });
          const exists = s.lines.find((l) => l.key === newKey);
          if (exists) {
            // merge qty into existing line and remove this one
            return {
              lines: s.lines
                .map((l) => l.key === newKey ? { ...l, qty: l.qty + line.qty } : l)
                .filter((l) => l.key !== key),
            };
          }
          return { lines: s.lines.map((l) => l.key === key ? { ...l, size, key: newKey } : l) };
        }),
      setOpen: (open) => set({ open }),
      clear: () => set({ lines: [] }),
    }),
    { name: "sen-cart" },
  ),
);

export const cartCount = (lines: CartLine[]) => lines.reduce((n, l) => n + l.qty, 0);
export const cartTotal = (lines: CartLine[]) => lines.reduce((n, l) => n + l.qty * l.price, 0);
