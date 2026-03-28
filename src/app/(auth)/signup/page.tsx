import { redirect } from "next/navigation";
import Link from "next/link";

import { sql } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { SignupForm } from "./SignupForm";

async function signupAction(
  _prevState: { error: string } | null,
  formData: FormData,
): Promise<{ error: string }> {
  "use server";

  const name = (formData.get("name") as string)?.trim();
  const email = (formData.get("email") as string)?.toLowerCase().trim();
  const password = formData.get("password") as string;
  const orgName = (formData.get("orgName") as string)?.trim();

  if (!name || !email || !password || !orgName) {
    return { error: "All fields are required." };
  }

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  // Check if email already exists
  const existing = await sql`
    SELECT id FROM users WHERE email = ${email} LIMIT 1
  `;
  if (existing.length > 0) {
    return { error: "An account with this email already exists." };
  }

  const passwordHash = await hashPassword(password);

  // Create user
  const userRows = await sql`
    INSERT INTO users (email, name, password_hash)
    VALUES (${email}, ${name}, ${passwordHash})
    RETURNING id
  `;
  const userId = userRows[0].id;

  // Create organization
  const orgRows = await sql`
    INSERT INTO organizations (name, slug)
    VALUES (${orgName}, ${orgName.toLowerCase().replace(/[^a-z0-9]+/g, "-")})
    RETURNING id
  `;
  const orgId = orgRows[0].id;

  // Create org membership
  await sql`
    INSERT INTO org_members (org_id, user_id, role)
    VALUES (${orgId}, ${userId}, 'owner')
  `;

  await createSession({
    userId,
    orgId,
    role: "owner",
    email,
    name,
  });

  redirect("/dashboard");
}

export default function SignupPage() {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_20px_50px_-12px_rgba(0,0,0,0.5)] backdrop-blur-2xl sm:p-10">
      {/* Inner glow */}
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]"
        aria-hidden="true"
      />

      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold tracking-tight text-white">
          Create your account
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          Start dominating search results
        </p>
      </div>

      <SignupForm action={signupAction} />

      <p className="mt-8 text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-emerald-400 transition-colors hover:text-emerald-300"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
