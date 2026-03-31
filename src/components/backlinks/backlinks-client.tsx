"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2, Search, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface BacklinkProspect {
  id: string;
  domain: string;
  url: string | null;
  domain_authority: number | null;
  contact_name: string | null;
  contact_email: string | null;
  status: string;
  source: string | null;
}

interface BacklinksClientProps {
  clientId: string;
  initialProspects: BacklinkProspect[];
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  new: { label: "Prospect", className: "bg-blue-500/15 text-blue-400 ring-blue-500/25" },
  contacted: { label: "Contacted", className: "bg-amber-500/15 text-amber-400 ring-amber-500/25" },
  replied: { label: "Replied", className: "bg-purple-500/15 text-purple-400 ring-purple-500/25" },
  won: { label: "Secured", className: "bg-emerald-500/15 text-emerald-400 ring-emerald-500/25" },
  lost: { label: "Lost", className: "bg-slate-500/15 text-slate-400 ring-slate-500/25" },
  rejected: { label: "Rejected", className: "bg-red-500/15 text-red-400 ring-red-500/25" },
};

function getDaColor(da: number | null): string {
  if (da === null) return "text-muted-foreground";
  if (da >= 70) return "text-emerald-400";
  if (da >= 40) return "text-amber-400";
  return "text-red-400";
}

export function BacklinksClient({ clientId, initialProspects }: BacklinksClientProps) {
  const router = useRouter();
  const [prospects, setProspects] = useState(initialProspects);
  const [isScanning, setIsScanning] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDomain, setNewDomain] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newContact, setNewContact] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  async function handleScan() {
    setIsScanning(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/backlinks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "scan" }),
      });
      if (res.ok) {
        router.refresh();
        window.location.reload();
      }
    } finally {
      setIsScanning(false);
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newDomain.trim()) return;
    setIsAdding(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/backlinks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: newDomain.trim(),
          contact_name: newContact.trim() || null,
          contact_email: newEmail.trim() || null,
        }),
      });
      if (res.ok) {
        const prospect = await res.json();
        setProspects((prev) => [prospect, ...prev]);
        setNewDomain("");
        setNewEmail("");
        setNewContact("");
        setShowAddForm(false);
      }
    } finally {
      setIsAdding(false);
    }
  }

  async function handleDelete(prospectId: string) {
    setProspects((prev) => prev.filter((p) => p.id !== prospectId));
    try {
      await fetch(`/api/clients/${clientId}/backlinks`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prospectId }),
      });
    } catch {
      router.refresh();
    }
  }

  const securedCount = prospects.filter((p) => p.status === "won").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-base text-muted-foreground">
            {prospects.length} prospect{prospects.length !== 1 ? "s" : ""}
            {securedCount > 0 && (
              <span className="text-emerald-400"> &middot; {securedCount} secured</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowAddForm(!showAddForm)} className="gap-1.5">
            {showAddForm ? <X className="size-3" /> : <Plus className="size-3" />}
            {showAddForm ? "Cancel" : "Add Prospect"}
          </Button>
          <Button size="sm" onClick={handleScan} disabled={isScanning} className="gap-1.5">
            {isScanning ? <Loader2 className="size-3 animate-spin" /> : <Search className="size-3" />}
            {isScanning ? "Scanning..." : "Scan for Prospects"}
          </Button>
        </div>
      </div>

      {/* Add form */}
      {showAddForm && (
        <form onSubmit={handleAdd} className="rounded-xl border border-white/[0.06] bg-slate-900/70 p-4 flex flex-wrap gap-3 items-end">
          <div className="space-y-1 flex-1 min-w-[180px]">
            <label className="text-xs text-muted-foreground">Domain *</label>
            <Input placeholder="example.com" value={newDomain} onChange={(e) => setNewDomain(e.target.value)} className="text-sm" />
          </div>
          <div className="space-y-1 flex-1 min-w-[150px]">
            <label className="text-xs text-muted-foreground">Contact Name</label>
            <Input placeholder="John Doe" value={newContact} onChange={(e) => setNewContact(e.target.value)} className="text-sm" />
          </div>
          <div className="space-y-1 flex-1 min-w-[180px]">
            <label className="text-xs text-muted-foreground">Email</label>
            <Input placeholder="john@example.com" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="text-sm" />
          </div>
          <Button type="submit" size="sm" disabled={isAdding || !newDomain.trim()} className="gap-1.5">
            {isAdding ? <Loader2 className="size-3 animate-spin" /> : <Plus className="size-3" />}
            Add
          </Button>
        </form>
      )}

      {/* Table */}
      {prospects.length === 0 ? (
        <div className="rounded-xl border border-white/[0.06] bg-slate-900/70 backdrop-blur-sm px-6 py-16 text-center">
          <h2 className="text-lg font-semibold text-foreground">No backlink prospects yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">Add prospects or run a scan to find opportunities.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-slate-900/70 backdrop-blur-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="px-4 py-3 font-medium text-muted-foreground">Domain</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground text-right">DA</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Contact</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Email</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Source</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {prospects.map((prospect) => {
                  const statusInfo = STATUS_CONFIG[prospect.status] ?? STATUS_CONFIG.new;
                  return (
                    <tr key={prospect.id} className="group transition-colors hover:bg-white/[0.02]">
                      <td className="px-4 py-3 font-medium text-foreground">{prospect.domain}</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        <span className={cn("font-semibold", getDaColor(prospect.domain_authority))}>
                          {prospect.domain_authority ?? "\u2014"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{prospect.contact_name ?? "\u2014"}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {prospect.contact_email ? (
                          <a href={`mailto:${prospect.contact_email}`} className="hover:text-emerald-400 transition-colors">
                            {prospect.contact_email}
                          </a>
                        ) : "\u2014"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset", statusInfo.className)}>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{prospect.source ?? "\u2014"}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDelete(prospect.id)}
                          className="size-6 flex items-center justify-center rounded text-muted-foreground opacity-0 group-hover:opacity-60 hover:!opacity-100 hover:text-red-400 hover:bg-red-400/10 transition-all"
                          title="Delete prospect"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
