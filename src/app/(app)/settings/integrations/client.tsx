"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface ConnectedInfo {
  email: string;
  lastSync: string | null;
}

interface IntegrationsClientProps {
  connectedMap: Record<string, ConnectedInfo>;
}

const INTEGRATIONS = [
  {
    id: "google-search-console",
    name: "Google Search Console",
    description:
      "Import keyword rankings, clicks, impressions, and CTR directly from GSC.",
    isGoogle: true,
  },
  {
    id: "google-analytics",
    name: "Google Analytics",
    description:
      "Track organic traffic, user behavior, and conversion data across your client sites.",
    isGoogle: true,
  },
  {
    id: "google-my-business",
    name: "Google Business Profile",
    description:
      "Manage local SEO listings, reviews, and business profile performance.",
    isGoogle: true,
  },
  {
    id: "n8n",
    name: "n8n Automation",
    description:
      "Connect your n8n instance to power AI workflows and automated tasks.",
    isGoogle: false,
  },
] as const;

function GoogleIcon() {
  return (
    <svg className="size-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 001 12c0 1.77.42 3.44 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

export function IntegrationsClient({ connectedMap }: IntegrationsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  const errorParam = searchParams.get("error");
  const connectedParam = searchParams.get("connected");

  async function handleConnect(provider: string) {
    window.location.href = `/api/auth/google?provider=${provider}`;
  }

  async function handleDisconnect(provider: string) {
    setDisconnecting(provider);
    try {
      await fetch("/api/integrations/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      router.refresh();
    } finally {
      setDisconnecting(null);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(16,185,129,0.08), transparent)",
        }}
        aria-hidden="true"
      />

      <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        <header className="animate-[fade-in_0.5s_ease-out_both]">
          <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Integrations
          </h1>
          <p className="mt-1 text-base text-muted-foreground">
            Connect third-party services to power your SEO workflows
          </p>
        </header>

        {/* Status banner */}
        {connectedParam && (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400 animate-[fade-in_0.3s_ease-out_both]">
            Successfully connected {connectedParam.replace(/-/g, " ")}!
          </div>
        )}

        {errorParam && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400 animate-[fade-in_0.3s_ease-out_both]">
            Connection failed: {decodeURIComponent(errorParam)}
          </div>
        )}

        {/* Summary */}
        <div className="flex items-center gap-4 animate-[fade-in_0.5s_ease-out_0.1s_both]">
          <div className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400 border border-emerald-500/20">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            {Object.keys(connectedMap).length} Connected
          </div>
          <div className="flex items-center gap-1.5 rounded-lg bg-slate-500/10 px-3 py-1.5 text-xs font-medium text-muted-foreground border border-white/[0.06]">
            <span className="size-1.5 rounded-full bg-slate-500" />
            {INTEGRATIONS.length - Object.keys(connectedMap).length} Available
          </div>
        </div>

        {/* Setup instructions */}
        {Object.keys(connectedMap).length === 0 && (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-5 py-4 animate-[fade-in_0.5s_ease-out_0.15s_both]">
            <h3 className="text-sm font-semibold text-amber-400">Setup Required</h3>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              To connect Google services, add these env vars to your Railway/Render deployment:
            </p>
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground font-mono">
              <li>GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com</li>
              <li>GOOGLE_CLIENT_SECRET=your-secret</li>
            </ul>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              Get these from{" "}
              <a
                href="https://console.cloud.google.com/apis/credentials"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-400 underline underline-offset-2"
              >
                Google Cloud Console
              </a>
              . Enable the Search Console API and Analytics API. Set the OAuth redirect URI to:
            </p>
            <code className="mt-1 block rounded-lg bg-black/30 px-3 py-2 text-xs text-emerald-400">
              https://your-domain.up.railway.app/api/auth/google/callback
            </code>
          </div>
        )}

        {/* Integration grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2">
          {INTEGRATIONS.map((integration, index) => {
            const connected = connectedMap[integration.id];
            const isConnected = !!connected;
            const isDisconnecting = disconnecting === integration.id;

            return (
              <div
                key={integration.id}
                className="group relative flex flex-col gap-4 rounded-xl border border-white/[0.06] bg-slate-900/70 backdrop-blur-sm p-5 transition-all hover:border-white/[0.10]"
                style={{
                  animationDelay: `${index * 80}ms`,
                  animation: "slide-up 0.4s ease-out both",
                }}
              >
                {isConnected && (
                  <div
                    className="pointer-events-none absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{
                      background:
                        "radial-gradient(ellipse at 50% 0%, rgba(16,185,129,0.06), transparent 70%)",
                    }}
                    aria-hidden="true"
                  />
                )}

                <div className="flex items-start justify-between">
                  <div
                    className={cn(
                      "flex size-12 items-center justify-center rounded-xl border",
                      isConnected
                        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                        : "border-white/[0.06] bg-slate-800 text-muted-foreground",
                    )}
                  >
                    {integration.isGoogle ? <GoogleIcon /> : (
                      <svg className="size-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15l-4-4 1.41-1.41L11 14.17l6.59-6.59L19 9l-8 8z" />
                      </svg>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span
                      className={cn(
                        "size-2 rounded-full",
                        isConnected
                          ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]"
                          : "bg-slate-600",
                      )}
                    />
                    <span
                      className={cn(
                        "text-xs font-medium",
                        isConnected ? "text-emerald-400" : "text-muted-foreground",
                      )}
                    >
                      {isConnected ? "Connected" : "Disconnected"}
                    </span>
                  </div>
                </div>

                <div className="flex-1 space-y-1">
                  <h3 className="font-heading text-sm font-semibold text-foreground">
                    {integration.name}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {integration.description}
                  </p>
                  {connected?.email && (
                    <p className="text-[11px] text-emerald-400/70 mt-1">
                      {connected.email}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  {connected?.lastSync ? (
                    <span className="text-[11px] text-muted-foreground">
                      Last sync: {new Date(connected.lastSync).toLocaleDateString()}
                    </span>
                  ) : (
                    <span />
                  )}

                  {isConnected ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDisconnect(integration.id)}
                      disabled={isDisconnecting}
                    >
                      {isDisconnecting ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        "Disconnect"
                      )}
                    </Button>
                  ) : integration.isGoogle ? (
                    <Button
                      size="sm"
                      onClick={() => handleConnect(integration.id)}
                      className="gap-1.5"
                    >
                      Connect
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" disabled>
                      Configure
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
