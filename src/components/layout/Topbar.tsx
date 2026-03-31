"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Bell, Search, ChevronRight, LogOut, User, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useApp } from "@/contexts/AppContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { ClientSwitcher } from "./ClientSwitcher";

const ROUTE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  clients: "Clients",
  intelligence: "Intelligence",
  content: "Content Factory",
  outreach: "Outreach",
  activity: "Activity Log",
  settings: "Settings",
};

function buildBreadcrumbs(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  const crumbs: Array<{ label: string; href: string }> = [];

  let path = "";
  for (const segment of segments) {
    path += `/${segment}`;
    const label = ROUTE_LABELS[segment] ?? segment.replace(/-/g, " ");
    crumbs.push({
      label: label.charAt(0).toUpperCase() + label.slice(1),
      href: path,
    });
  }

  return crumbs;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function Topbar() {
  const pathname = usePathname();
  const { session, isSidebarCollapsed } = useApp();
  const breadcrumbs = buildBreadcrumbs(pathname);

  return (
    <header
      className={cn(
        "fixed top-0 right-0 z-30 flex h-topbar items-center gap-4 border-b border-border px-6",
        "bg-background/60 backdrop-blur-xl backdrop-saturate-150",
        "transition-[left] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
        isSidebarCollapsed ? "left-sidebar-collapsed" : "left-sidebar-expanded"
      )}
    >
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 min-w-0">
        <ol className="flex items-center gap-1 text-sm">
          {breadcrumbs.map((crumb, index) => {
            const isLast = index === breadcrumbs.length - 1;
            return (
              <li key={crumb.href} className="flex items-center gap-1">
                {index > 0 && (
                  <ChevronRight
                    className="size-3.5 text-muted-foreground/50"
                    aria-hidden="true"
                  />
                )}
                {isLast ? (
                  <span className="font-600 text-foreground truncate">
                    {crumb.label}
                  </span>
                ) : (
                  <Link
                    href={crumb.href}
                    className="text-muted-foreground transition-colors hover:text-foreground truncate"
                  >
                    {crumb.label}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Center: client switcher + search */}
      <div className="flex flex-1 items-center justify-center gap-3">
        <ClientSwitcher />

        <div className="relative hidden md:block">
          <Search
            className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            type="search"
            placeholder="Search..."
            className={cn(
              "h-8 w-56 rounded-lg border border-border bg-muted/50 pl-9 pr-3 text-sm text-foreground",
              "placeholder:text-muted-foreground/60",
              "outline-none transition-all duration-150",
              "focus:w-72 focus:border-nexus-accent/30 focus:ring-1 focus:ring-nexus-accent/20"
            )}
            aria-label="Search"
          />
          <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            /
          </kbd>
        </div>
      </div>

      {/* Right: notifications + user */}
      <div className="flex items-center gap-2">
        <button
          className={cn(
            "relative flex size-8 items-center justify-center rounded-lg",
            "text-muted-foreground transition-colors duration-150",
            "hover:bg-muted hover:text-foreground",
            "outline-none focus-visible:ring-2 focus-visible:ring-nexus-accent/50"
          )}
          aria-label="Notifications"
        >
          <Bell className="size-4" aria-hidden="true" />
          {/* Notification dot */}
          <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-nexus-accent" />
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              "flex items-center gap-2 rounded-lg px-2 py-1",
              "transition-colors duration-150 hover:bg-muted",
              "outline-none focus-visible:ring-2 focus-visible:ring-nexus-accent/50"
            )}
          >
            <Avatar size="sm">
              <AvatarFallback className="bg-nexus-accent/20 text-xs font-600 text-nexus-accent">
                {getInitials(session.name)}
              </AvatarFallback>
            </Avatar>
            <span className="hidden text-sm font-500 text-foreground md:block">
              {session.name}
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={8}>
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="text-sm font-600">{session.name}</span>
                <span className="text-xs text-muted-foreground">
                  {session.email}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <MenuPrimitive.Item
              data-slot="dropdown-menu-item"
              className="group/dropdown-menu-item relative flex cursor-default items-center gap-1.5 rounded-md px-1.5 py-1 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
              render={<Link href="/settings/profile" />}
            >
              <User className="size-4" aria-hidden="true" />
              Profile
            </MenuPrimitive.Item>
            <MenuPrimitive.Item
              data-slot="dropdown-menu-item"
              className="group/dropdown-menu-item relative flex cursor-default items-center gap-1.5 rounded-md px-1.5 py-1 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
              render={<Link href="/settings/integrations" />}
            >
              <Settings className="size-4" aria-hidden="true" />
              Settings
            </MenuPrimitive.Item>
            <DropdownMenuSeparator />
            <MenuPrimitive.Item
              data-slot="dropdown-menu-item"
              data-variant="destructive"
              className="group/dropdown-menu-item relative flex cursor-default items-center gap-1.5 rounded-md px-1.5 py-1 text-sm outline-hidden select-none data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 data-[variant=destructive]:focus:text-destructive dark:data-[variant=destructive]:focus:bg-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
              onClick={() => {
                document.cookie = "nexus_session=; path=/; max-age=0";
                window.location.href = "/login";
              }}
            >
              <LogOut className="size-4" aria-hidden="true" />
              Log out
            </MenuPrimitive.Item>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
