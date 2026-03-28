"use client";

import { cn } from "@/lib/utils";
import { useApp } from "@/contexts/AppContext";

export function MainContent({ children }: { children: React.ReactNode }) {
  const { isSidebarCollapsed } = useApp();

  return (
    <main
      className={cn(
        "min-h-screen transition-[margin-left] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
        isSidebarCollapsed ? "ml-sidebar-collapsed" : "ml-sidebar-expanded"
      )}
    >
      <div className="pt-topbar">
        <div className="p-6 lg:p-8">{children}</div>
      </div>
    </main>
  );
}
