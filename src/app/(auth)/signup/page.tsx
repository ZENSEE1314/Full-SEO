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
    <div className="rounded-xl border border-white/10 bg-slate-900/70 p-8 shadow-2xl shadow-black/40 backdrop-blur-xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-white">Create your account</h1>
        <p className="mt-1 text-sm text-slate-400">
          Start optimizing your SEO performance today.
        </p>
      </div>

      <SignupForm action={signupAction} />

      <p className="mt-6 text-center text-sm text-slate-400">
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
