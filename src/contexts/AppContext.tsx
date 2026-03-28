"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
} from "react";
import type { SessionData } from "@/lib/auth/session";
import type { Client } from "@/types";

interface AppContextValue {
  session: SessionData;
  clients: Client[];
  activeClientId: string | null;
  activeClient: Client | null;
  setActiveClient: (clientId: string | null) => void;
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error("useApp must be used within AppProvider");
  }
  return ctx;
}

interface AppProviderProps {
  session: SessionData;
  clients: Client[];
  initialClientId: string | null;
  children: React.ReactNode;
}

export function AppProvider({
  session,
  clients,
  initialClientId,
  children,
}: AppProviderProps) {
  const [activeClientId, setActiveClientId] = useState<string | null>(
    initialClientId
  );
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const activeClient = useMemo(
    () => clients.find((c) => c.id === activeClientId) ?? null,
    [clients, activeClientId]
  );

  const setActiveClient = useCallback((clientId: string | null) => {
    setActiveClientId(clientId);

    const url = new URL(window.location.href);
    if (clientId) {
      url.searchParams.set("clientId", clientId);
    } else {
      url.searchParams.delete("clientId");
    }
    window.history.replaceState({}, "", url.toString());
  }, []);

  const toggleSidebar = useCallback(() => {
    setIsSidebarCollapsed((prev) => !prev);
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      session,
      clients,
      activeClientId,
      activeClient,
      setActiveClient,
      isSidebarCollapsed,
      toggleSidebar,
    }),
    [
      session,
      clients,
      activeClientId,
      activeClient,
      setActiveClient,
      isSidebarCollapsed,
      toggleSidebar,
    ]
  );

  return <AppContext value={value}>{children}</AppContext>;
}
