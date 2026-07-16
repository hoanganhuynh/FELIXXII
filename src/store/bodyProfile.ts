import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Measurements } from "../data/sizing";

interface BodyProfileState {
  measurements: Measurements | null;
  name: string;
  modalOpen: boolean;
  save: (m: Measurements, name?: string) => void;
  clear: () => void;
  setModal: (open: boolean) => void;
}

/** Persisted to localStorage — this is the "user account" body profile. */
export const useBodyProfile = create<BodyProfileState>()(
  persist(
    (set) => ({
      measurements: null,
      name: "",
      modalOpen: false,
      save: (measurements, name) => set((s) => ({ measurements, name: name ?? s.name, modalOpen: false })),
      clear: () => set({ measurements: null }),
      setModal: (modalOpen) => set({ modalOpen }),
    }),
    { name: "sen-body-profile" },
  ),
);
