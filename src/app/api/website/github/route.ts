import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth/session";

const GITHUB_API = "https://api.github.com";
const MAX_FILE_SIZE = 500_000; // 500KB per file
const ALLOWED_EXTENSIONS = new Set([
  "html", "htm", "css", "js", "jsx", "ts", "tsx", "json", "xml",
  "svg", "txt", "md", "php", "vue", "svelte", "astro",
]);

export async function POST(req: NextRequest) {
  try {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { clientId, repoUrl, branch = "main", token } = body;

  if (!clientId || !repoUrl) {
    return NextResponse.json({ error: "Missing clientId or repoUrl" }, { status: 400 });
  }

  const clientCheck = await sql`
    SELECT id FROM clients WHERE id = ${clientId} AND org_id = ${session.orgId}
  `;
  if (clientCheck.length === 0) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  // Parse repo URL: "https://github.com/owner/repo" or "owner/repo"
  const repoPath = parseRepoPath(repoUrl);
  if (!repoPath) {
    return NextResponse.json({ error: "Invalid GitHub repo URL. Use format: owner/repo or https://github.com/owner/repo" }, { status: 400 });
  }

  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "NEXUS-SEO",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  // Fetch repo tree
  let tree;
  try {
    const treeRes = await fetch(
      `${GITHUB_API}/repos/${repoPath}/git/trees/${branch}?recursive=1`,
      { headers }
    );
    if (!treeRes.ok) {
      const errData = await treeRes.json().catch(() => ({}));
      if (treeRes.status === 404) {
        return NextResponse.json({ error: "Repository not found. Check the URL and make sure the repo is public (or provide a token for private repos)." }, { status: 404 });
      }
      return NextResponse.json({ error: (errData as Record<string, string>).message || "Failed to fetch repo" }, { status: treeRes.status });
    }
    tree = await treeRes.json();
  } catch {
    return NextResponse.json({ error: "Failed to connect to GitHub" }, { status: 502 });
  }

  // Filter to allowed file types
  const treeItems = (tree.tree || []) as Array<{
    path: string;
    type: string;
    size?: number;
    sha: string;
  }>;

  const eligibleFiles = treeItems.filter((item) => {
    if (item.type !== "blob") return false;
    if ((item.size ?? 0) > MAX_FILE_SIZE) return false;
    const ext = item.path.split(".").pop()?.toLowerCase() ?? "";
    return ALLOWED_EXTENSIONS.has(ext);
  });

  if (eligibleFiles.length === 0) {
    return NextResponse.json({ error: "No supported files found in repository" }, { status: 404 });
  }

  // Fetch file contents (batch, max 50 files)
  const filesToFetch = eligibleFiles.slice(0, 50);
  let fetched = 0;

  for (const file of filesToFetch) {
    try {
      const contentRes = await fetch(
        `${GITHUB_API}/repos/${repoPath}/contents/${file.path}?ref=${branch}`,
        { headers }
      );
      if (!contentRes.ok) continue;

      const contentData = await contentRes.json() as { content?: string; encoding?: string };
      if (!contentData.content || contentData.encoding !== "base64") continue;

      const content = Buffer.from(contentData.content, "base64").toString("utf-8");
      const ext = file.path.split(".").pop()?.toLowerCase() ?? "txt";

      await sql`
        INSERT INTO website_files (client_id, file_path, content, file_type, file_size, source, github_repo, github_branch, github_sha)
        VALUES (${clientId}, ${file.path}, ${content}, ${ext}, ${file.size ?? 0}, 'github', ${repoPath}, ${branch}, ${file.sha})
        ON CONFLICT (client_id, file_path)
        DO UPDATE SET content = EXCLUDED.content, file_size = EXCLUDED.file_size,
                      github_sha = EXCLUDED.github_sha, updated_at = NOW()
      `;
      fetched++;
    } catch {
      // Skip files that fail to fetch
    }
  }

  await sql`
    INSERT INTO agent_action_log (client_id, module, action_type, summary, status, triggered_by)
    VALUES (${clientId}, 'website', 'github_import', ${"Imported " + fetched + " files from " + repoPath}, 'completed', 'user')
  `;

  return NextResponse.json({
    ok: true,
    fetched,
    total: eligibleFiles.length,
    repo: repoPath,
    branch,
  });
  } catch (error) {
    console.error("[website/github] POST error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}

function parseRepoPath(input: string): string | null {
  // "https://github.com/owner/repo" or "https://github.com/owner/repo.git"
  const urlMatch = input.match(/github\.com\/([^/]+\/[^/\s]+?)(?:\.git)?(?:\/|$)/);
  if (urlMatch) return urlMatch[1];

  // "owner/repo"
  const shortMatch = input.match(/^([a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+)$/);
  if (shortMatch) return shortMatch[1];

  return null;
}
