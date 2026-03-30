import { sql } from "@/lib/db";

const SCOPES = [
  "https://www.googleapis.com/auth/webmasters.readonly",
  "https://www.googleapis.com/auth/analytics.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
];

interface GoogleCredentials {
  clientId: string;
  clientSecret: string;
}

export async function getGoogleCredentials(userId: string): Promise<GoogleCredentials> {
  // Try DB first (saved from user's Settings page)
  try {
    const rows = await sql`
      SELECT properties FROM integrations
      WHERE user_id = ${userId}::uuid AND provider = 'google-credentials' AND is_active = true
      LIMIT 1
    `;
    if (rows.length > 0) {
      const props = (rows[0] as { properties: { client_id?: string; client_secret?: string } }).properties;
      if (props.client_id && props.client_secret) {
        return { clientId: props.client_id, clientSecret: props.client_secret };
      }
    }
  } catch {
    // Table might not exist yet
  }

  // Fall back to env vars
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Google credentials not configured. Add them in Settings > Integrations.");
  }

  return { clientId, clientSecret };
}

export function buildGoogleAuthUrl(
  clientId: string,
  state: string,
  redirectUri: string,
): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string,
  credentials: GoogleCredentials,
): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
}> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error_description ?? "Token exchange failed");
  }

  return res.json();
}

export async function refreshAccessToken(
  refreshToken: string,
  credentials: GoogleCredentials,
): Promise<{ access_token: string; expires_in: number }> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    throw new Error("Failed to refresh token");
  }

  return res.json();
}

export async function getGoogleUserEmail(accessToken: string): Promise<string> {
  const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  return data.email ?? "unknown";
}
