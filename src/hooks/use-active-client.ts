"use client";

import { useApp } from "@/contexts/AppContext";

export function useActiveClient() {
  const { activeClientId, activeClient, setActiveClient } = useApp();

  return {
    activeClientId,
    activeClient,
    setActiveClient,
  };
}
