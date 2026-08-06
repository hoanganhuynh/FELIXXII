import { create } from "zustand";

interface UnsavedGuardState {
  dirty: boolean;
  onSaveDraft: ((to: string) => Promise<void>) | null;
  pendingPath: string | null;
  /** Called by a form once it has unsaved changes, with a callback that
   *  saves-as-draft and navigates to whatever path is passed to it. */
  arm: (onSaveDraft: (to: string) => Promise<void>) => void;
  /** Called once the form is clean again (saved, or its own effect re-checks
   *  and finds nothing unsaved) — also called on unmount as a safety net. */
  disarm: () => void;
  /** Guarded links call this instead of navigating directly. Returns true
   *  when it's safe to navigate immediately; otherwise it opens the
   *  confirm-leave prompt and the caller should not navigate. */
  requestLeave: (path: string) => boolean;
  clearPending: () => void;
}

export const useUnsavedGuard = create<UnsavedGuardState>((set, get) => ({
  dirty: false,
  onSaveDraft: null,
  pendingPath: null,
  arm: (onSaveDraft) => set({ dirty: true, onSaveDraft }),
  disarm: () => set({ dirty: false, onSaveDraft: null, pendingPath: null }),
  requestLeave: (path) => {
    if (!get().dirty) return true;
    set({ pendingPath: path });
    return false;
  },
  clearPending: () => set({ pendingPath: null }),
}));
