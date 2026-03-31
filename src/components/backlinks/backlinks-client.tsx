"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2, Search, X, Mail, MessageCircle, Send, ChevronDown } from "lucide-react";

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
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDomain, setNewDomain] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newContact, setNewContact] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  // Outreach modal
  const [outreachTarget, setOutreachTarget] = useState<BacklinkProspect | null>(null);
  const [outreachType, setOutreachType] = useState<"email" | "whatsapp" | null>(null);
  const [outreachSubject, setOutreachSubject] = useState("");
  const [outreachMessage, setOutreachMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<string | null>(null);

  // Pagination
  const [visibleCount, setVisibleCount] = useState(50);

  async function handleScan() {
    setIsScanning(true);
    setScanResult(null);
    try {
      const res = await fetch(`/api/clients/${clientId}/backlinks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "scan" }),
      });
      if (res.ok) {
        const data = await res.json();
        setScanResult(`Found ${data.found} prospects`);
        window.location.reload();
      }
    } catch {
      setScanResult("Scan failed");
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

  function openOutreach(prospect: BacklinkProspect, type: "email" | "whatsapp") {
    setOutreachTarget(prospect);
    setOutreachType(type);
    setSendResult(null);
    setOutreachSubject(`Collaboration Opportunity — ${prospect.domain}`);
    setOutreachMessage(
      type === "email"
        ? `Hi ${prospect.contact_name ?? "there"},\n\nI came across ${prospect.domain} and was impressed by your content. I'd love to explore a potential backlink collaboration that would benefit both our audiences.\n\nWould you be open to a quick chat?\n\nBest regards`
        : `Hi ${prospect.contact_name ?? "there"}! 👋 I found ${prospect.domain} and would love to discuss a backlink collaboration. Are you open to connecting?`,
    );
  }

  async function handleSendOutreach() {
    if (!outreachTarget || !outreachType) return;
    setIsSending(true);
    setSendResult(null);
    try {
      const res = await fetch(`/api/clients/${clientId}/backlinks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: outreachType === "email" ? "send-email" : "send-whatsapp",
          prospectId: outreachTarget.id,
          subject: outreachSubject,
          message: outreachMessage,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSendResult(data.message ?? "Sent!");
        setProspects((prev) =>
          prev.map((p) => (p.id === outreachTarget.id ? { ...p, status: "contacted" } : p)),
        );
        setTimeout(() => {
          setOutreachTarget(null);
          setOutreachType(null);
        }, 2000);
      } else {
        setSendResult(data.error ?? "Failed to send");
      }
    } catch {
      setSendResult("Network error");
    } finally {
      setIsSending(false);
    }
  }

  const securedCount = prospects.filter((p) => p.status === "won").length;
  const contactedCount = prospects.filter((p) => p.status === "contacted").length;
  const withEmail = prospects.filter((p) => p.contact_email).length;
  const visibleProspects = prospects.slice(0, visibleCount);

  return (
    <div className="space-y-6">
      {/* Stats bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total Prospects", value: prospects.length, color: "text-foreground" },
          { label: "With Email", value: withEmail, color: "text-blue-400" },
          { label: "Contacted", value: contactedCount, color: "text-amber-400" },
          { label: "Secured", value: securedCount, color: "text-emerald-400" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-white/[0.06] bg-slate-900/70 p-3">
            <p className={cn("text-2xl font-bold tabular-nums", stat.color)}>{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => setShowAddForm(!showAddForm)} className="gap-1.5">
          {showAddForm ? <X className="size-3" /> : <Plus className="size-3" />}
          {showAddForm ? "Cancel" : "Add Prospect"}
        </Button>
        <Button size="sm" onClick={handleScan} disabled={isScanning} className="gap-1.5">
          {isScanning ? <Loader2 className="size-3 animate-spin" /> : <Search className="size-3" />}
          {isScanning ? "Scanning ~1000 prospects..." : "Deep Scan (1000+)"}
        </Button>
        {scanResult && <span className="text-xs text-emerald-400">{scanResult}</span>}
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

      {/* Outreach Modal */}
      {outreachTarget && outreachType && (
        <div className="rounded-xl border border-white/[0.06] bg-slate-900/90 backdrop-blur-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              {outreachType === "email" ? (
                <><Mail className="size-4 text-blue-400" /> Email Outreach</>
              ) : (
                <><MessageCircle className="size-4 text-green-400" /> WhatsApp Message</>
              )}
              <span className="text-xs text-muted-foreground font-normal">→ {outreachTarget.domain}</span>
            </h3>
            <button onClick={() => { setOutreachTarget(null); setOutreachType(null); }} className="text-muted-foreground hover:text-foreground">
              <X className="size-4" />
            </button>
          </div>

          {outreachType === "email" && (
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Subject</label>
              <Input value={outreachSubject} onChange={(e) => setOutreachSubject(e.target.value)} className="text-sm" />
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Message</label>
            <textarea
              value={outreachMessage}
              onChange={(e) => setOutreachMessage(e.target.value)}
              rows={5}
              className="w-full rounded-lg border border-white/[0.06] bg-slate-800/50 px-3 py-2 text-sm text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
            />
          </div>

          {sendResult && (
            <p className={cn("text-xs", sendResult.includes("fail") || sendResult.includes("error") ? "text-red-400" : "text-emerald-400")}>
              {sendResult}
            </p>
          )}

          <div className="flex gap-2">
            <Button size="sm" onClick={handleSendOutreach} disabled={isSending || !outreachMessage.trim()} className="gap-1.5">
              {isSending ? <Loader2 className="size-3 animate-spin" /> : <Send className="size-3" />}
              {isSending ? "Sending..." : "Send"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setOutreachTarget(null); setOutreachType(null); }}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      {prospects.length === 0 ? (
        <div className="rounded-xl border border-white/[0.06] bg-slate-900/70 backdrop-blur-sm px-6 py-16 text-center">
          <h2 className="text-lg font-semibold text-foreground">No backlink prospects yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">Run a deep scan to find 1000+ prospects with contact data.</p>
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
                  <th className="px-4 py-3 font-medium text-muted-foreground">Outreach</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {visibleProspects.map((prospect) => {
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
                          <a href={`mailto:${prospect.contact_email}`} className="hover:text-emerald-400 transition-colors text-xs">
                            {prospect.contact_email}
                          </a>
                        ) : "\u2014"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset", statusInfo.className)}>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {prospect.contact_email && (
                            <button
                              onClick={() => openOutreach(prospect, "email")}
                              className="size-7 flex items-center justify-center rounded-md text-blue-400 hover:bg-blue-400/10 transition-colors"
                              title="Send email"
                            >
                              <Mail className="size-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => openOutreach(prospect, "whatsapp")}
                            className="size-7 flex items-center justify-center rounded-md text-green-400 hover:bg-green-400/10 transition-colors"
                            title="Send WhatsApp"
                          >
                            <MessageCircle className="size-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDelete(prospect.id)}
                          className="size-6 flex items-center justify-center rounded text-muted-foreground opacity-0 group-hover:opacity-60 hover:!opacity-100 hover:text-red-400 hover:bg-red-400/10 transition-all"
                          title="Delete"
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

          {/* Load more */}
          {visibleCount < prospects.length && (
            <div className="border-t border-white/[0.06] px-4 py-3 text-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setVisibleCount((prev) => prev + 100)}
                className="gap-1.5"
              >
                <ChevronDown className="size-3" />
                Show more ({prospects.length - visibleCount} remaining)
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
