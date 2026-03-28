"use client";

import { useState, useCallback, useTransition } from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  ArrowUpDown,
  MoreHorizontal,
  ExternalLink,
  Mail,
  Trash2,
  ChevronUp,
  ChevronDown,
  ListPlus,
} from "lucide-react";
import type { BacklinkProspect, Client } from "@/types";

const STATUS_CONFIG = {
  new: { label: "New", className: "bg-slate-500/10 text-slate-400 border-slate-500/20" },
  contacted: { label: "Contacted", className: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  replied: { label: "Replied", className: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  won: { label: "Won", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  lost: { label: "Lost", className: "bg-red-500/10 text-red-400 border-red-500/20" },
  rejected: { label: "Rejected", className: "bg-red-500/10 text-red-300 border-red-500/20" },
} as const;

const STATUS_OPTIONS: BacklinkProspect["status"][] = [
  "new",
  "contacted",
  "replied",
  "won",
  "lost",
  "rejected",
];

type SortField = "domain" | "domain_authority" | "status" | "created_at";
type SortDirection = "asc" | "desc";

interface ProspectTableProps {
  prospects: BacklinkProspect[];
  clients: Client[];
  statusFilter: string;
  clientFilter: string;
}

function getDaBadgeClass(da: number | null): string {
  if (da === null) return "bg-slate-500/10 text-slate-500 border-slate-500/20";
  if (da >= 80) return "bg-emerald-500/15 text-emerald-400 border-emerald-500/20";
  if (da >= 50) return "bg-amber-500/15 text-amber-400 border-amber-500/20";
  return "bg-slate-500/10 text-slate-400 border-slate-500/20";
}

export function ProspectTable({
  prospects: initialProspects,
  clients,
  statusFilter,
  clientFilter,
}: ProspectTableProps) {
  const [prospects, setProspects] = useState(initialProspects);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [isPending, startTransition] = useTransition();

  const handleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      } else {
        setSortField(field);
        setSortDirection("asc");
      }
    },
    [sortField]
  );

  const sortedProspects = [...prospects].sort((a, b) => {
    const dir = sortDirection === "asc" ? 1 : -1;
    switch (sortField) {
      case "domain":
        return dir * a.domain.localeCompare(b.domain);
      case "domain_authority":
        return dir * ((a.domain_authority ?? 0) - (b.domain_authority ?? 0));
      case "status":
        return dir * a.status.localeCompare(b.status);
      case "created_at":
        return dir * a.created_at.localeCompare(b.created_at);
      default:
        return 0;
    }
  });

  const isAllSelected =
    prospects.length > 0 && selectedIds.size === prospects.length;

  const handleSelectAll = useCallback(() => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(prospects.map((p) => p.id)));
    }
  }, [isAllSelected, prospects]);

  const handleSelectOne = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleStatusChange = useCallback(
    (prospectId: string, newStatus: BacklinkProspect["status"]) => {
      startTransition(async () => {
        try {
          const response = await fetch("/api/outreach/prospects", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: prospectId, status: newStatus }),
          });
          if (response.ok) {
            setProspects((prev) =>
              prev.map((p) =>
                p.id === prospectId ? { ...p, status: newStatus } : p
              )
            );
          }
        } catch {
          // Silently handle - status will remain unchanged
        }
      });
    },
    []
  );

  const getClientName = useCallback(
    (clientId: string) => {
      return clients.find((c) => c.id === clientId)?.name ?? "Unknown";
    },
    [clients]
  );

  function SortableHeader({
    field,
    children,
  }: {
    field: SortField;
    children: React.ReactNode;
  }) {
    const isActive = sortField === field;
    return (
      <button
        onClick={() => handleSort(field)}
        className="inline-flex items-center gap-1 text-left hover:text-foreground transition-colors"
      >
        {children}
        {isActive ? (
          sortDirection === "asc" ? (
            <ChevronUp className="size-3.5" />
          ) : (
            <ChevronDown className="size-3.5" />
          )
        ) : (
          <ArrowUpDown className="size-3 opacity-40" />
        )}
      </button>
    );
  }

  return (
    <div className="space-y-4">
      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-2.5 animate-[fade-in_0.2s_ease-out_both]">
          <span className="text-sm text-emerald-400 font-medium">
            {selectedIds.size} selected
          </span>
          <Button size="sm" className="gap-1.5">
            <ListPlus className="size-3.5" data-icon="inline-start" />
            Add to Sequence
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelectedIds(new Set())}
          >
            Clear
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-white/[0.06] bg-slate-900/70 backdrop-blur-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-white/[0.06] hover:bg-transparent">
              <TableHead className="w-10 pl-4">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={handleSelectAll}
                  className="size-3.5 rounded border-white/20 bg-transparent accent-emerald-500 cursor-pointer"
                  aria-label="Select all prospects"
                />
              </TableHead>
              <TableHead className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">
                <SortableHeader field="domain">Domain</SortableHeader>
              </TableHead>
              <TableHead className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">
                <SortableHeader field="domain_authority">DA</SortableHeader>
              </TableHead>
              <TableHead className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">
                Contact
              </TableHead>
              <TableHead className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">
                <SortableHeader field="status">Status</SortableHeader>
              </TableHead>
              <TableHead className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">
                Source
              </TableHead>
              <TableHead className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">
                Client
              </TableHead>
              <TableHead className="text-muted-foreground text-xs uppercase tracking-wider font-semibold w-10">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedProspects.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="h-48 text-center text-muted-foreground"
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className="rounded-xl bg-emerald-500/10 p-3">
                      <Mail className="size-6 text-emerald-400" />
                    </div>
                    <p className="font-medium text-foreground">
                      No prospects found
                    </p>
                    <p className="text-sm">
                      Discover new prospects or add them manually.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              sortedProspects.map((prospect, index) => (
                <TableRow
                  key={prospect.id}
                  className={cn(
                    "border-white/[0.04] transition-colors",
                    selectedIds.has(prospect.id) && "bg-emerald-500/5"
                  )}
                  style={{
                    animationDelay: `${index * 30}ms`,
                    animation: "fade-in 0.3s ease-out both",
                  }}
                >
                  <TableCell className="pl-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(prospect.id)}
                      onChange={() => handleSelectOne(prospect.id)}
                      className="size-3.5 rounded border-white/20 bg-transparent accent-emerald-500 cursor-pointer"
                      aria-label={`Select ${prospect.domain}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium text-foreground">
                    <div className="flex items-center gap-2">
                      <div className="flex size-7 items-center justify-center rounded-md bg-slate-800 border border-white/[0.06] text-xs font-bold text-muted-foreground uppercase">
                        {prospect.domain.charAt(0)}
                      </div>
                      <span className="truncate max-w-[180px]">
                        {prospect.domain}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-bold tabular-nums",
                        getDaBadgeClass(prospect.domain_authority)
                      )}
                    >
                      {prospect.domain_authority ?? "--"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      {prospect.contact_name && (
                        <span className="text-sm text-foreground truncate max-w-[150px]">
                          {prospect.contact_name}
                        </span>
                      )}
                      {prospect.contact_email && (
                        <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                          {prospect.contact_email}
                        </span>
                      )}
                      {!prospect.contact_name && !prospect.contact_email && (
                        <span className="text-xs text-muted-foreground">
                          No contact
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={prospect.status}
                      onValueChange={(val) =>
                        handleStatusChange(
                          prospect.id,
                          val as BacklinkProspect["status"]
                        )
                      }
                    >
                      <SelectTrigger
                        size="sm"
                        className={cn(
                          "h-6 gap-1 border rounded-full px-2.5 text-xs font-medium w-fit",
                          STATUS_CONFIG[prospect.status].className,
                          isPending && "opacity-60"
                        )}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((status) => (
                          <SelectItem key={status} value={status}>
                            <span className="flex items-center gap-2">
                              <span
                                className={cn(
                                  "size-1.5 rounded-full",
                                  status === "new" && "bg-slate-400",
                                  status === "contacted" && "bg-blue-400",
                                  status === "replied" && "bg-amber-400",
                                  status === "won" && "bg-emerald-400",
                                  status === "lost" && "bg-red-400",
                                  status === "rejected" && "bg-red-300"
                                )}
                              />
                              {STATUS_CONFIG[status].label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">
                      {prospect.source ?? "Manual"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {getClientName(prospect.client_id)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            aria-label={`Actions for ${prospect.domain}`}
                          />
                        }
                      >
                        <MoreHorizontal className="size-3.5" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem>
                          <ExternalLink className="size-3.5" />
                          Visit domain
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Mail className="size-3.5" />
                          Send outreach
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive">
                          <Trash2 className="size-3.5" />
                          Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
