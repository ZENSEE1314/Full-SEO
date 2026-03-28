import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { Globe, Plus, Building2, ExternalLink } from "lucide-react";

export const metadata = {
  title: "Provider Portal | NEXUS SEO",
};

export default async function ProviderPortalPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen bg-background">
      {/* Atmospheric background */}
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(16,185,129,0.08), transparent)",
        }}
        aria-hidden="true"
      />

      <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between animate-[fade-in_0.5s_ease-out_both]">
          <div>
            <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Provider Portal
            </h1>
            <p className="mt-1 text-base text-muted-foreground">
              Manage external SEO service providers and partnerships
            </p>
          </div>
        </header>

        {/* Empty state */}
        <div
          className="flex flex-col items-center justify-center rounded-xl border border-white/[0.04] bg-slate-900/40 py-24 text-center animate-[slide-up_0.4s_ease-out_both]"
        >
          {/* Decorative layered icons */}
          <div className="relative mb-6">
            <div className="rounded-2xl bg-emerald-500/10 p-5">
              <Globe className="size-10 text-emerald-400" />
            </div>
            <div className="absolute -right-3 -top-2 rounded-lg bg-blue-500/10 p-2 border border-blue-500/20">
              <Building2 className="size-4 text-blue-400" />
            </div>
            <div className="absolute -left-3 -bottom-2 rounded-lg bg-amber-500/10 p-2 border border-amber-500/20">
              <ExternalLink className="size-4 text-amber-400" />
            </div>
          </div>

          <h3 className="font-heading text-xl font-bold text-foreground">
            Provider Portal coming soon
          </h3>
          <p className="mt-2 max-w-md text-sm text-muted-foreground leading-relaxed">
            Track external SEO providers, manage service agreements, and
            coordinate link building partnerships -- all from one place.
          </p>

          {/* Feature preview cards */}
          <div className="mt-10 grid max-w-lg grid-cols-1 gap-3 sm:grid-cols-3 w-full px-4">
            {[
              {
                title: "Provider Directory",
                description: "Catalog of vetted providers",
              },
              {
                title: "Service Tracking",
                description: "Monitor deliverables & quality",
              },
              {
                title: "Contact Management",
                description: "Centralized provider contacts",
              },
            ].map((feature, index) => (
              <div
                key={feature.title}
                className="rounded-lg border border-dashed border-white/[0.08] bg-slate-900/30 p-3.5 text-left"
                style={{
                  animationDelay: `${300 + index * 100}ms`,
                  animation: "fade-in 0.4s ease-out both",
                }}
              >
                <p className="text-xs font-semibold text-foreground/80">
                  {feature.title}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
