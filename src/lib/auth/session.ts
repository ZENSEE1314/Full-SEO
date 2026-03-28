import { cookies } from "next/headers";

const SESSION_COOKIE_NAME = "nexus_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

export interface SessionData {
  userId: string;
  orgId: string;
  role: string;
  email: string;
  name: string;
}

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET environment variable is required");
  }
  return new TextEncoder().encode(secret);
}

async function sign(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    getSecretKey() as BufferSource,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload) as BufferSource,
  );
  const signatureBase64 = btoa(
    String.fromCharCode(...new Uint8Array(signature)),
  );
  return `${payload}.${signatureBase64}`;
}

async function verify(token: string): Promise<string | null> {
  const lastDot = token.lastIndexOf(".");
  if (lastDot === -1) return null;

  const payload = token.slice(0, lastDot);
  const signatureBase64 = token.slice(lastDot + 1);

  const key = await crypto.subtle.importKey(
    "raw",
    getSecretKey() as BufferSource,
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
    signatureBytes as BufferSource,
    new TextEncoder().encode(payload) as BufferSource,
  );

  return isValid ? payload : null;
}

export async function createSession(data: SessionData): Promise<void> {
  const payload = JSON.stringify({
    ...data,
    exp: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
  });

  const token = await sign(payload);
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
  });
}

export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = await verify(token);
  if (!payload) return null;

  try {
    const data = JSON.parse(payload);
    if (data.exp < Date.now()) return null;
    return {
      userId: data.userId,
      orgId: data.orgId,
      role: data.role,
      email: data.email,
      name: data.name,
    };
  } catch {
    return null;
  }
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
}
