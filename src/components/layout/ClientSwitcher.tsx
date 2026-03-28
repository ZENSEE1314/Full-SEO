"use client";

import { useState } from "react";
import { ChevronsUpDown, Check, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { useApp } from "@/contexts/AppContext";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-nexus-accent",
  paused: "bg-warning",
  archived: "bg-muted-foreground",
};

export function ClientSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const { clients, activeClientId, activeClient, setActiveClient } = useApp();

  function handleSelect(clientId: string) {
    if (clientId === "all") {
      setActiveClient(null);
    } else {
      setActiveClient(clientId);
    }
    setIsOpen(false);
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger
        className={cn(
          "flex h-8 items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 text-sm",
          "transition-colors duration-150 hover:border-nexus-accent/30 hover:bg-muted",
          "outline-none focus-visible:ring-2 focus-visible:ring-nexus-accent/50"
        )}
      >
        <Globe className="size-3.5 text-muted-foreground" aria-hidden="true" />
        <span className="max-w-32 truncate font-500">
          {activeClient?.name ?? "All Clients"}
        </span>
        <ChevronsUpDown
          className="size-3.5 text-muted-foreground"
          aria-hidden="true"
        />
      </PopoverTrigger>
      <PopoverContent
        className="w-64 p-0"
        align="start"
      >
        <Command>
          <CommandInput placeholder="Search clients..." />
          <CommandList>
            <CommandEmpty>No clients found.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="all"
                onSelect={() => handleSelect("all")}
                data-checked={!activeClientId ? "true" : undefined}
              >
                <Globe className="size-4 text-muted-foreground" aria-hidden="true" />
                <span>All Clients</span>
                {!activeClientId && (
                  <Check className="ml-auto size-4 text-nexus-accent" aria-hidden="true" />
                )}
              </CommandItem>
            </CommandGroup>
            <CommandGroup heading="Clients">
              {clients.map((client) => {
                const isSelected = activeClientId === client.id;
                return (
                  <CommandItem
                    key={client.id}
                    value={client.name}
                    onSelect={() => handleSelect(client.id)}
                    data-checked={isSelected ? "true" : undefined}
                  >
                    <span
                      className={cn(
                        "size-2 shrink-0 rounded-full",
                        STATUS_COLORS[client.status] ?? "bg-muted-foreground"
                      )}
                      aria-hidden="true"
                    />
                    <span className="truncate">{client.name}</span>
                    {client.health_score !== null && (
                      <span className="ml-auto font-mono text-xs text-muted-foreground">
                        {client.health_score}
                      </span>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
