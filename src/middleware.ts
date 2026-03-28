import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/signup"];
const PUBLIC_PREFIXES = ["/api/webhooks/"];
const SESSION_COOKIE_NAME = "nexus_session";

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

async function verifySessionToken(
  token: string,
  secret: string,
): Promise<Record<string, string> | null> {
  const lastDot = token.lastIndexOf(".");
  if (lastDot === -1) return null;

  const payload = token.slice(0, lastDot);
  const signatureBase64 = token.slice(lastDot + 1);

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );

  const signatureBytes = Uint8Array.from(atob(signatureBase64), (c) =>
    c.charCodeAt(0),
  );

  const isValid = await crypto.subtle.verify(
    "HMAC",
    key,
    signatureBytes,
    new TextEncoder().encode(payload),
  );

  if (!isValid) return null;

  try {
    const data = JSON.parse(payload);
    if (data.exp < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (isPublicPath(pathname)) {
    // If user is already logged in and visits login/signup, redirect to dashboard
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (token && (pathname === "/login" || pathname === "/signup")) {
      const secret = process.env.SESSION_SECRET;
      if (secret) {
        const session = await verifySessionToken(token, secret);
        if (session) {
          return NextResponse.redirect(new URL("/dashboard", request.url));
        }
      }
    }
    return NextResponse.next();
  }

  // Allow static files and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const session = await verifySessionToken(token, secret);
  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Set user context headers for API routes
  const response = NextResponse.next();
  response.headers.set("x-user-id", session.userId);
  response.headers.set("x-org-id", session.orgId);
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all paths except static files and Next.js internals.
     * This runs the middleware on all page and API routes.
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
