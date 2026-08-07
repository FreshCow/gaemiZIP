"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { syncFavoritesFromServer } from "@/lib/favoriteSync";

export function AuthStoreInitializer() {
  const init = useAuthStore((s) => s.init);
  useEffect(() => {
    init();
    if (useAuthStore.getState().isLoggedIn) {
      syncFavoritesFromServer().catch(() => {});
    }
  }, [init]);
  return null;
}
