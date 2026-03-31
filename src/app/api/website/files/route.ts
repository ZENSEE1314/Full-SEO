import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const clientId = req.nextUrl.searchParams.get("clientId");
    if (!clientId) return NextResponse.json({ error: "Missing clientId" }, { status: 400 });

    const clientCheck = await sql`
      SELECT id FROM clients WHERE id = ${clientId} AND org_id = ${session.orgId}
    `;
    if (clientCheck.length === 0) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // If fileId + withContent, return single file with content
    const fileId = req.nextUrl.searchParams.get("fileId");
    const withContent = req.nextUrl.searchParams.get("withContent");

    if (fileId && withContent) {
      const rows = await sql`
        SELECT id, file_path, content, file_type, file_size
        FROM website_files
        WHERE id = ${fileId} AND client_id = ${clientId}
      `;
      if (rows.length === 0) return NextResponse.json({ error: "File not found" }, { status: 404 });
      const file = rows[0] as { content: string };
      return NextResponse.json({ content: file.content });
    }

    const files = await sql`
      SELECT id, file_path, file_type, file_size, source, github_repo, github_branch,
             created_at::text, updated_at::text
      FROM website_files
      WHERE client_id = ${clientId}
      ORDER BY file_path ASC
    `;

    return NextResponse.json({ files });
  } catch (error) {
    console.error("[website/files] GET error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { clientId, files } = body as {
      clientId: string;
      files: Array<{ path: string; content: string; type: string }>;
    };

    if (!clientId || !files || files.length === 0) {
      return NextResponse.json({ error: "Missing clientId or files" }, { status: 400 });
    }

    const clientCheck = await sql`
      SELECT id FROM clients WHERE id = ${clientId} AND org_id = ${session.orgId}
    `;
    if (clientCheck.length === 0) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    let uploaded = 0;
    for (const file of files) {
      const size = new Blob([file.content]).size;
      await sql`
        INSERT INTO website_files (client_id, file_path, content, file_type, file_size, source)
        VALUES (${clientId}, ${file.path}, ${file.content}, ${file.type}, ${size}, 'upload')
        ON CONFLICT (client_id, file_path)
        DO UPDATE SET content = EXCLUDED.content, file_size = EXCLUDED.file_size,
                      file_type = EXCLUDED.file_type, updated_at = NOW()
      `;
      uploaded++;
    }

    await sql`
      INSERT INTO agent_action_log (client_id, module, action_type, summary, status, triggered_by)
      VALUES (${clientId}, 'website', 'files_uploaded', ${"Uploaded " + uploaded + " website file(s)"}, 'success', 'user')
    `;

    return NextResponse.json({ ok: true, uploaded });
  } catch (error) {
    console.error("[website/files] POST error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { fileId, clientId, content } = body;

    if (!fileId || !clientId || content === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const clientCheck = await sql`
      SELECT id FROM clients WHERE id = ${clientId} AND org_id = ${session.orgId}
    `;
    if (clientCheck.length === 0) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const size = new Blob([content]).size;
    await sql`
      UPDATE website_files
      SET content = ${content}, file_size = ${size}, updated_at = NOW()
      WHERE id = ${fileId} AND client_id = ${clientId}
    `;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[website/files] PATCH error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { fileId, clientId, deleteAll } = body;

    if (!clientId) return NextResponse.json({ error: "Missing clientId" }, { status: 400 });

    const clientCheck = await sql`
      SELECT id FROM clients WHERE id = ${clientId} AND org_id = ${session.orgId}
    `;
    if (clientCheck.length === 0) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    if (deleteAll) {
      await sql`DELETE FROM website_files WHERE client_id = ${clientId}`;
    } else if (fileId) {
      await sql`DELETE FROM website_files WHERE id = ${fileId} AND client_id = ${clientId}`;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[website/files] DELETE error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}
