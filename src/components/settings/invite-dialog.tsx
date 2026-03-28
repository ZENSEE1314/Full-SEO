"use client";

import { useState, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { UserPlus, Shield, UserIcon, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

const ROLE_OPTIONS = [
  {
    value: "admin",
    label: "Admin",
    description: "Full access to all features",
    icon: Shield,
  },
  {
    value: "member",
    label: "Member",
    description: "Can manage clients and content",
    icon: UserIcon,
  },
  {
    value: "viewer",
    label: "Viewer",
    description: "Read-only access to reports",
    icon: Eye,
  },
] as const;

export function InviteDialog() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [isPending, startTransition] = useTransition();

  const handleInvite = useCallback(() => {
    if (!email.trim()) return;

    startTransition(async () => {
      try {
        const response = await fetch("/api/settings/team/invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim(), role }),
        });

        if (response.ok) {
          setIsOpen(false);
          setEmail("");
          setRole("member");
          router.refresh();
        }
      } catch {
        // Invite failed
      }
    });
  }, [email, role, router]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger
        render={<Button className="gap-1.5" />}
      >
        <UserPlus className="size-4" data-icon="inline-start" />
        Invite Member
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite team member</DialogTitle>
          <DialogDescription>
            Send an invite to add a new member to your organization.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="invite-email">Email address</Label>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@company.com"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Role</Label>
            <div className="grid gap-2">
              {ROLE_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isActive = role === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setRole(opt.value)}
                    type="button"
                    className={cn(
                      "flex items-center gap-3 rounded-lg border p-3 text-left transition-all",
                      isActive
                        ? "border-emerald-500/40 bg-emerald-500/5"
                        : "border-white/[0.06] bg-slate-900/50 hover:border-white/[0.12]"
                    )}
                  >
                    <div
                      className={cn(
                        "flex size-8 items-center justify-center rounded-lg",
                        isActive
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-slate-800 text-muted-foreground"
                      )}
                    >
                      <Icon className="size-4" />
                    </div>
                    <div className="flex-1">
                      <p
                        className={cn(
                          "text-sm font-medium",
                          isActive ? "text-foreground" : "text-muted-foreground"
                        )}
                      >
                        {opt.label}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {opt.description}
                      </p>
                    </div>
                    {isActive && (
                      <div className="size-2 rounded-full bg-emerald-500" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={handleInvite}
            disabled={!email.trim() || isPending}
          >
            {isPending ? "Sending..." : "Send Invite"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
