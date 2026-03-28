import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { sql } from "@/lib/db";
import type { Client } from "@/types";
import { AppProvider } from "@/contexts/AppContext";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { MainContent } from "@/components/layout/MainContent";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  let clients: Client[] = [];
  try {
    const clientRows = await sql`
      SELECT id, name, domain, status, health_score
      FROM clients
      WHERE org_id = ${session.orgId}
      ORDER BY name
    `;
    clients = clientRows as unknown as Client[];
  } catch {
    clients = [];
  }

  return (
    <AppProvider
      session={session}
      clients={clients}
      initialClientId={null}
    >
      <Sidebar />
      <Topbar />
      <MainContent>{children}</MainContent>
    </AppProvider>
  );
}
