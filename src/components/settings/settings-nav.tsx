"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, Plug, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/settings/profile", label: "Profile", icon: User },
  { href: "/settings/integrations", label: "Integrations", icon: Plug },
  { href: "/settings/team", label: "Team", icon: Users },
] as const;

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 border-b border-white/[0.06] pb-px animate-[fade-in_0.5s_ease-out_0.05s_both]">
      {TABS.map((tab) => {
        const isActive = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors",
              isActive
                ? "text-emerald-400 border-b-2 border-emerald-400 -mb-px"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <tab.icon className="size-4" aria-hidden="true" />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
