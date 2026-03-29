"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Building2,
  Brain,
  FileText,
  Mail,
  Activity,
  Settings,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useApp } from "@/contexts/AppContext";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/clients", label: "Clients", icon: Building2 },
  { href: "/intelligence/trends", label: "Intelligence", icon: Brain, matchPrefix: "/intelligence" },
  { href: "/content-factory/briefs", label: "Content Factory", icon: FileText, matchPrefix: "/content-factory" },
  { href: "/outreach/prospects", label: "Outreach", icon: Mail, matchPrefix: "/outreach" },
  { href: "/activity-log", label: "Activity Log", icon: Activity },
  { href: "/settings/team", label: "Settings", icon: Settings, matchPrefix: "/settings" },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const { isSidebarCollapsed, toggleSidebar } = useApp();

  return (
    <TooltipProvider>
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex flex-col border-r border-sidebar-border bg-sidebar",
          "transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
          isSidebarCollapsed ? "w-sidebar-collapsed" : "w-sidebar-expanded"
        )}
      >
        {/* Subtle gradient overlay for depth */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-nexus-glow/50 via-transparent to-transparent" />

        {/* Logo */}
        <div className="relative flex h-topbar items-center gap-3 border-b border-sidebar-border px-4">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-nexus-accent">
            <span className="font-display text-sm font-800 text-nexus-accent-foreground">
              N
            </span>
          </div>
          <div
            className={cn(
              "flex flex-col overflow-hidden transition-[opacity,width] duration-300",
              isSidebarCollapsed
                ? "w-0 opacity-0"
                : "w-auto opacity-100"
            )}
          >
            <span className="font-display text-sm font-700 tracking-tight text-foreground whitespace-nowrap">
              NEXUS
              <span className="text-nexus-accent">-SEO</span>
            </span>
            <span className="text-[10px] font-500 uppercase tracking-widest text-muted-foreground whitespace-nowrap">
              Command Center
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="relative flex-1 overflow-y-auto px-3 py-4">
          <ul className="flex flex-col gap-1" role="list">
            {NAV_ITEMS.map((item) => {
              const prefix = ("matchPrefix" in item ? item.matchPrefix : item.href) as string;
              const isActive =
                pathname === item.href ||
                pathname.startsWith(`${prefix}/`);
              const Icon = item.icon;

              const linkContent = (
                <Link
                  href={item.href}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-500 transition-colors duration-150",
                    "outline-none focus-visible:ring-2 focus-visible:ring-nexus-accent/50",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                  )}
                  aria-current={isActive ? "page" : undefined}
                >
                  {/* Active indicator bar */}
                  {isActive && (
                    <span className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-full bg-nexus-accent" />
                  )}

                  <Icon
                    className={cn(
                      "size-[18px] shrink-0 transition-colors duration-150",
                      isActive
                        ? "text-nexus-accent"
                        : "text-muted-foreground group-hover:text-sidebar-accent-foreground"
                    )}
                    aria-hidden="true"
                  />

                  <span
                    className={cn(
                      "overflow-hidden whitespace-nowrap transition-[opacity,width] duration-300",
                      isSidebarCollapsed
                        ? "w-0 opacity-0"
                        : "w-auto opacity-100"
                    )}
                  >
                    {item.label}
                  </span>
                </Link>
              );

              if (isSidebarCollapsed) {
                return (
                  <li key={item.href}>
                    <Tooltip>
                      <TooltipTrigger render={<div />}>
                        {linkContent}
                      </TooltipTrigger>
                      <TooltipContent side="right" sideOffset={8}>
                        {item.label}
                      </TooltipContent>
                    </Tooltip>
                  </li>
                );
              }

              return <li key={item.href}>{linkContent}</li>;
            })}
          </ul>
        </nav>

        {/* Collapse toggle */}
        <div className="relative border-t border-sidebar-border p-3">
          <button
            onClick={toggleSidebar}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-500",
              "text-muted-foreground transition-colors duration-150",
              "hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
              "outline-none focus-visible:ring-2 focus-visible:ring-nexus-accent/50"
            )}
            aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isSidebarCollapsed ? (
              <PanelLeft className="size-[18px] shrink-0" aria-hidden="true" />
            ) : (
              <PanelLeftClose className="size-[18px] shrink-0" aria-hidden="true" />
            )}
            <span
              className={cn(
                "overflow-hidden whitespace-nowrap transition-[opacity,width] duration-300",
                isSidebarCollapsed
                  ? "w-0 opacity-0"
                  : "w-auto opacity-100"
              )}
            >
              Collapse
            </span>
          </button>
        </div>
      </aside>
    </TooltipProvider>
  );
}
