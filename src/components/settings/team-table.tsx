"use client";

import React, { useState, useCallback, useTransition } from "react";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { MoreHorizontal, Shield, ShieldCheck, UserIcon, Eye, Trash2 } from "lucide-react";
import { format } from "date-fns";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: "owner" | "admin" | "member" | "viewer";
  created_at: string;
}

const ROLE_CONFIG = {
  owner: {
    label: "Owner",
    className: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    icon: ShieldCheck,
  },
  admin: {
    label: "Admin",
    className: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    icon: Shield,
  },
  member: {
    label: "Member",
    className: "bg-slate-500/10 text-slate-400 border-slate-500/20",
    icon: UserIcon,
  },
  viewer: {
    label: "Viewer",
    className: "border-white/[0.08] text-muted-foreground",
    icon: Eye,
  },
} as const;

const ASSIGNABLE_ROLES = ["admin", "member", "viewer"] as const;

interface TeamTableProps {
  members: TeamMember[];
  currentUserId: string;
  currentUserRole: string;
}

export function TeamTable({
  members: initialMembers,
  currentUserId,
  currentUserRole,
}: TeamTableProps) {
  const [members, setMembers] = useState(initialMembers);
  const [confirmRemove, setConfirmRemove] = useState<TeamMember | null>(null);
  const [isPending, startTransition] = useTransition();

  const isOwner = currentUserRole === "owner";

  const handleChangeRole = useCallback(
    (memberId: string, newRole: string) => {
      startTransition(async () => {
        try {
          const response = await fetch("/api/settings/team", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ memberId, role: newRole }),
          });
          if (response.ok) {
            setMembers((prev) =>
              prev.map((m) =>
                m.id === memberId
                  ? { ...m, role: newRole as TeamMember["role"] }
                  : m
              )
            );
          }
        } catch {
          // Role change failed
        }
      });
    },
    []
  );

  const handleRemoveMember = useCallback(() => {
    if (!confirmRemove) return;
    const memberId = confirmRemove.id;

    startTransition(async () => {
      try {
        const response = await fetch("/api/settings/team", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ memberId }),
        });
        if (response.ok) {
          setMembers((prev) => prev.filter((m) => m.id !== memberId));
          setConfirmRemove(null);
        }
      } catch {
        // Remove failed
      }
    });
  }, [confirmRemove]);

  function getInitials(name: string): string {
    return name
      .split(" ")
      .map((n) => n.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  return (
    <>
      <div className="rounded-xl border border-white/[0.06] bg-slate-900/70 backdrop-blur-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-white/[0.06] hover:bg-transparent">
              <TableHead className="text-muted-foreground text-xs uppercase tracking-wider font-semibold pl-4">
                Member
              </TableHead>
              <TableHead className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">
                Email
              </TableHead>
              <TableHead className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">
                Role
              </TableHead>
              <TableHead className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">
                Joined
              </TableHead>
              <TableHead className="text-muted-foreground text-xs uppercase tracking-wider font-semibold w-10">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member, index) => {
              const roleConfig = ROLE_CONFIG[member.role];
              const RoleIcon = roleConfig.icon;
              const isSelf = member.id === currentUserId;
              const canModify = isOwner && !isSelf && member.role !== "owner";

              return (
                <TableRow
                  key={member.id}
                  className="border-white/[0.04] transition-colors"
                  style={{
                    animationDelay: `${index * 40}ms`,
                    animation: "fade-in 0.3s ease-out both",
                  }}
                >
                  <TableCell className="pl-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="size-8 border border-white/[0.06]">
                        <AvatarFallback className="bg-slate-800 text-xs font-medium text-muted-foreground">
                          {getInitials(member.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-foreground">
                          {member.name}
                          {isSelf && (
                            <span className="ml-1.5 text-xs text-muted-foreground">
                              (you)
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {member.email}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
                        roleConfig.className
                      )}
                    >
                      <RoleIcon className="size-3" />
                      {roleConfig.label}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground tabular-nums">
                      {format(new Date(member.created_at), "MMM d, yyyy")}
                    </span>
                  </TableCell>
                  <TableCell>
                    {canModify && (
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              aria-label={`Actions for ${member.name}`}
                            />
                          }
                        >
                          <MoreHorizontal className="size-3.5" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Change role</DropdownMenuLabel>
                          {ASSIGNABLE_ROLES.map((role) => (
                            <DropdownMenuItem
                              key={role}
                              disabled={member.role === role}
                              onClick={() => handleChangeRole(member.id, role)}
                            >
                              {React.createElement(ROLE_CONFIG[role].icon, {
                                className: "size-3.5",
                              })}
                              {ROLE_CONFIG[role].label}
                            </DropdownMenuItem>
                          ))}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setConfirmRemove(member)}
                          >
                            <Trash2 className="size-3.5" />
                            Remove member
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Remove confirmation dialog */}
      <Dialog
        open={confirmRemove !== null}
        onOpenChange={(open) => !open && setConfirmRemove(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove team member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove{" "}
              <span className="font-medium text-foreground">
                {confirmRemove?.name}
              </span>{" "}
              from the organization? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRemove(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemoveMember}
              disabled={isPending}
            >
              {isPending ? "Removing..." : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
