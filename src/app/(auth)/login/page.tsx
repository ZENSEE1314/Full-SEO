import { redirect } from "next/navigation";
import Link from "next/link";

import { sql } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { LoginForm } from "./LoginForm";

async function loginAction(
  _prevState: { error: string } | null,
  formData: FormData,
): Promise<{ error: string }> {
  "use server";

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const rows = await sql`
    SELECT u.id, u.email, u.name, u.password_hash, om.org_id, om.role
    FROM users u
    LEFT JOIN org_members om ON om.user_id = u.id
    WHERE u.email = ${email.toLowerCase().trim()}
    LIMIT 1
  `;

  if (rows.length === 0) {
    return { error: "Invalid email or password." };
  }

  const user = rows[0];
  const isValid = await verifyPassword(password, user.password_hash);
  if (!isValid) {
    return { error: "Invalid email or password." };
  }

  await createSession({
    userId: user.id,
    orgId: user.org_id ?? "",
    role: user.role ?? "owner",
    email: user.email,
    name: user.name,
  });

  redirect("/dashboard");
}

export default function LoginPage() {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/70 p-8 shadow-2xl shadow-black/40 backdrop-blur-xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-white">Welcome back</h1>
        <p className="mt-1 text-sm text-slate-400">
          Sign in to your account to continue.
        </p>
      </div>

      <LoginForm action={loginAction} />

      <p className="mt-6 text-center text-sm text-slate-400">
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          className="font-medium text-emerald-400 transition-colors hover:text-emerald-300"
        >
          Create one
        </Link>
      </p>
    </div>
  );
}
