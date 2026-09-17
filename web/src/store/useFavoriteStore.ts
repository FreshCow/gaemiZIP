import { create } from "zustand";

export type SyncStatus = "idle" | "loading" | "ready" | "error" | "reconciling";
export interface FavoriteCountState {
  value?: number;
  loading: boolean;
  error: string | null;
  requestId: number;
}

interface FavoriteState {
  ownerGeneration: number;
  syncStatus: SyncStatus;
  syncError: string | null;
  syncRequestId: number;
  pending: Record<string, number>;
  errors: Record<string, string | undefined>;
  counts: Record<string, FavoriteCountState | undefined>;
  resetAccount: (generation: number) => void;
}

export const useFavoriteStore = create<FavoriteState>((set) => ({
  ownerGeneration: 0, syncStatus: "idle", syncError: null, syncRequestId: 0,
  pending: {}, errors: {}, counts: {},
  resetAccount: (generation) => set({
    ownerGeneration: generation, syncStatus: "idle", syncError: null,
    syncRequestId: 0, pending: {}, errors: {},
  }),
}));
