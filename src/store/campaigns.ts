import { create } from "zustand";
import { listActiveCampaigns, type CampaignRow } from "../admin/api/campaigns";

interface CampaignsState {
  campaigns: CampaignRow[];
  loading: boolean;
  loaded: boolean;
  fetch: (force?: boolean) => Promise<void>;
}

/** Active, in-date-range campaigns (RLS-filtered) — fetched once and cached
 *  for the session, same idle/fetch pattern as `useProducts`. */
export const useCampaigns = create<CampaignsState>((set, get) => ({
  campaigns: [],
  loading: false,
  loaded: false,
  fetch: async (force = false) => {
    if (!force && (get().loaded || get().loading)) return;
    set({ loading: true });
    try {
      const campaigns = await listActiveCampaigns();
      set({ campaigns, loading: false, loaded: true });
    } catch {
      set({ loading: false, loaded: true });
    }
  },
}));
