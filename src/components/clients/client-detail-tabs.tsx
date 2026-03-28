"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const TABS = [
  { segment: "", label: "Overview" },
  { segment: "/keywords", label: "Keywords" },
  { segment: "/content", label: "Content" },
  { segment: "/technical", label: "Technical" },
  { segment: "/backlinks", label: "Backlinks" },
  { segment: "/settings", label: "Settings" },
] as const;

interface ClientDetailTabsProps {
  clientId: string;
}

export function ClientDetailTabs({ clientId }: ClientDetailTabsProps) {
  const pathname = usePathname();
  const basePath = `/clients/${clientId}`;

  return (
    <nav
      className="flex gap-1 overflow-x-auto rounded-lg border border-white/[0.06] bg-slate-900/50 p-1"
      role="tablist"
      aria-label="Client sections"
    >
      {TABS.map((tab) => {
        const href = `${basePath}${tab.segment}`;
        const isActive =
          tab.segment === ""
            ? pathname === basePath
            : pathname.startsWith(href);

        return (
          <Link
            key={tab.segment}
            href={href}
            role="tab"
            aria-selected={isActive}
            className={cn(
              "shrink-0 rounded-md px-4 py-2 text-sm font-medium transition-colors duration-150",
              "outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50",
              isActive
                ? "bg-white/10 text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-white/5",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
