"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, Key, User, Mail, Shield, Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ProfileClientProps {
  session: {
    name: string;
    email: string;
    role: string;
  };
  hasGoogleCredentials: boolean;
  hasReplicateKey: boolean;
}

export function ProfileClient({ session, hasGoogleCredentials, hasReplicateKey }: ProfileClientProps) {
  const router = useRouter();

  // Google credentials
  const [googleClientId, setGoogleClientId] = useState("");
  const [googleClientSecret, setGoogleClientSecret] = useState("");
  const [isSavingGoogle, setIsSavingGoogle] = useState(false);
  const [googleSaved, setGoogleSaved] = useState(hasGoogleCredentials);
  const [googleError, setGoogleError] = useState<string | null>(null);

  // Replicate API
  const [replicateToken, setReplicateToken] = useState("");
  const [isSavingReplicate, setIsSavingReplicate] = useState(false);
  const [replicateSaved, setReplicateSaved] = useState(hasReplicateKey);
  const [replicateError, setReplicateError] = useState<string | null>(null);

  // Show/hide secrets
  const [showGoogleSecret, setShowGoogleSecret] = useState(false);
  const [showReplicateToken, setShowReplicateToken] = useState(false);

  async function handleSaveGoogle(e: React.FormEvent) {
    e.preventDefault();
    setIsSavingGoogle(true);
    setGoogleError(null);
    try {
      const res = await fetch("/api/integrations/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: googleClientId, client_secret: googleClientSecret }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      setGoogleSaved(true);
      setGoogleClientId("");
      setGoogleClientSecret("");
      router.refresh();
    } catch (err) {
      setGoogleError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setIsSavingGoogle(false);
    }
  }

  async function handleSaveReplicate(e: React.FormEvent) {
    e.preventDefault();
    setIsSavingReplicate(true);
    setReplicateError(null);
    try {
      const res = await fetch("/api/integrations/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "replicate-api", api_token: replicateToken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      setReplicateSaved(true);
      setReplicateToken("");
      router.refresh();
    } catch (err) {
      setReplicateError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setIsSavingReplicate(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Account Info */}
      <section className="rounded-xl border border-white/[0.06] bg-slate-900/70 backdrop-blur-sm p-5 animate-[fade-in_0.5s_ease-out_both]">
        <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <User className="size-4 text-emerald-400" />
          Account
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <User className="size-3" /> Name
            </p>
            <p className="text-sm font-medium text-foreground">{session.name}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Mail className="size-3" /> Email
            </p>
            <p className="text-sm font-medium text-foreground">{session.email}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Shield className="size-3" /> Role
            </p>
            <p className="text-sm font-medium text-foreground capitalize">{session.role}</p>
          </div>
        </div>
      </section>

      {/* Google API Credentials */}
      <section className="rounded-xl border border-white/[0.06] bg-slate-900/70 backdrop-blur-sm p-5 animate-[fade-in_0.5s_ease-out_0.1s_both]">
        <div className="flex items-center gap-2 mb-4">
          <Key className="size-4 text-emerald-400" />
          <h2 className="text-sm font-semibold text-foreground">Google API Credentials</h2>
          {googleSaved && (
            <span className="ml-auto flex items-center gap-1 text-xs text-emerald-400">
              <Check className="size-3" /> Configured
            </span>
          )}
        </div>

        {googleSaved ? (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Your Google credentials are configured. Go to{" "}
              <a href="/settings/integrations" className="text-emerald-400 underline underline-offset-2">
                Integrations
              </a>{" "}
              to connect Search Console and Analytics.
            </p>
            <Button variant="outline" size="sm" onClick={() => setGoogleSaved(false)}>
              Update Credentials
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSaveGoogle} className="space-y-4">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Get these from{" "}
              <a
                href="https://console.cloud.google.com/apis/credentials"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-400 underline underline-offset-2"
              >
                Google Cloud Console
              </a>
              . Enable Search Console API + Analytics API. Set OAuth redirect URI to:
            </p>
            <code className="block rounded-lg bg-black/30 px-3 py-2 text-xs text-emerald-400">
              {typeof window !== "undefined" ? window.location.origin : "https://your-domain"}/api/auth/google/callback
            </code>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="google-client-id" className="text-xs font-medium text-muted-foreground">
                  Client ID
                </label>
                <Input
                  id="google-client-id"
                  placeholder="xxxxx.apps.googleusercontent.com"
                  value={googleClientId}
                  onChange={(e) => setGoogleClientId(e.target.value)}
                  className="font-mono text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="google-client-secret" className="text-xs font-medium text-muted-foreground">
                  Client Secret
                </label>
                <div className="relative">
                  <Input
                    id="google-client-secret"
                    type={showGoogleSecret ? "text" : "password"}
                    placeholder="GOCSPX-xxxxxxxxxx"
                    value={googleClientSecret}
                    onChange={(e) => setGoogleClientSecret(e.target.value)}
                    className="font-mono text-xs pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowGoogleSecret(!showGoogleSecret)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showGoogleSecret ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            {googleError && <p className="text-xs text-red-400">{googleError}</p>}

            <Button
              type="submit"
              size="sm"
              disabled={isSavingGoogle || !googleClientId.trim() || !googleClientSecret.trim()}
              className="gap-1.5"
            >
              {isSavingGoogle ? <Loader2 className="size-3 animate-spin" /> : <Key className="size-3" />}
              {isSavingGoogle ? "Saving..." : "Save Google Credentials"}
            </Button>
          </form>
        )}
      </section>

      {/* Replicate API Key */}
      <section className="rounded-xl border border-white/[0.06] bg-slate-900/70 backdrop-blur-sm p-5 animate-[fade-in_0.5s_ease-out_0.2s_both]">
        <div className="flex items-center gap-2 mb-4">
          <Key className="size-4 text-purple-400" />
          <h2 className="text-sm font-semibold text-foreground">Replicate API Key</h2>
          {replicateSaved && (
            <span className="ml-auto flex items-center gap-1 text-xs text-purple-400">
              <Check className="size-3" /> Configured
            </span>
          )}
        </div>

        {replicateSaved ? (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Your Replicate API key is configured. AI image generation in Content Factory is ready.
            </p>
            <Button variant="outline" size="sm" onClick={() => setReplicateSaved(false)}>
              Update API Key
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSaveReplicate} className="space-y-4">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Get your API token from{" "}
              <a
                href="https://replicate.com/account/api-tokens"
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-400 underline underline-offset-2"
              >
                Replicate Dashboard
              </a>
              . Used for AI image generation in the Content Factory.
            </p>

            <div className="max-w-md space-y-1.5">
              <label htmlFor="replicate-token" className="text-xs font-medium text-muted-foreground">
                API Token
              </label>
              <div className="relative">
                <Input
                  id="replicate-token"
                  type={showReplicateToken ? "text" : "password"}
                  placeholder="r8_xxxxxxxxxx..."
                  value={replicateToken}
                  onChange={(e) => setReplicateToken(e.target.value)}
                  className="font-mono text-xs pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowReplicateToken(!showReplicateToken)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showReplicateToken ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </button>
              </div>
            </div>

            {replicateError && <p className="text-xs text-red-400">{replicateError}</p>}

            <Button
              type="submit"
              size="sm"
              disabled={isSavingReplicate || !replicateToken.trim()}
              className="gap-1.5"
            >
              {isSavingReplicate ? <Loader2 className="size-3 animate-spin" /> : <Key className="size-3" />}
              {isSavingReplicate ? "Saving..." : "Save Replicate Key"}
            </Button>
          </form>
        )}
      </section>
    </div>
  );
}
