import { redirect } from "next/navigation";
import Link from "next/link";

import { getSession } from "@/lib/auth/session";
import { SettingsNav } from "@/components/settings/settings-nav";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

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

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-6 animate-[fade-in_0.5s_ease-out_both]">
          <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Settings
          </h1>
          <p className="mt-1 text-base text-muted-foreground">
            Manage your account, integrations, and team
          </p>
        </header>

        <SettingsNav />

        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
