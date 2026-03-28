"use client";

import { useActionState, useState, useCallback } from "react";
import { ArrowRight, Loader2, AlertCircle, Check } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SignupFormProps {
  action: (
    prevState: { error: string } | null,
    formData: FormData,
  ) => Promise<{ error: string }>;
}

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_STRONG_LENGTH = 12;

type PasswordStrength = "empty" | "weak" | "fair" | "strong";

function getPasswordStrength(password: string): PasswordStrength {
  if (password.length === 0) return "empty";

  let score = 0;
  if (password.length >= PASSWORD_MIN_LENGTH) score++;
  if (password.length >= PASSWORD_STRONG_LENGTH) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return "weak";
  if (score <= 3) return "fair";
  return "strong";
}

const STRENGTH_CONFIG: Record<
  Exclude<PasswordStrength, "empty">,
  { label: string; color: string; bg: string; width: string }
> = {
  weak: {
    label: "Weak",
    color: "text-red-400",
    bg: "bg-red-500",
    width: "w-1/3",
  },
  fair: {
    label: "Fair",
    color: "text-amber-400",
    bg: "bg-amber-500",
    width: "w-2/3",
  },
  strong: {
    label: "Strong",
    color: "text-emerald-400",
    bg: "bg-emerald-500",
    width: "w-full",
  },
};

const INPUT_CLASSES =
  "h-11 rounded-xl border-white/[0.06] bg-white/[0.03] px-4 text-sm text-white placeholder:text-slate-600 transition-all duration-200 focus-visible:border-emerald-500/40 focus-visible:bg-white/[0.05] focus-visible:ring-2 focus-visible:ring-emerald-500/15 focus-visible:shadow-[0_0_20px_-4px_rgba(16,185,129,0.15)]";

export function SignupForm({ action }: SignupFormProps) {
  const [state, formAction, isPending] = useActionState(action, null);
  const [password, setPassword] = useState("");

  const strength = getPasswordStrength(password);

  const handlePasswordChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setPassword(e.target.value);
    },
    [],
  );

  return (
    <form action={formAction} className="space-y-5">
      {state?.error && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-red-500/15 bg-red-500/[0.06] px-4 py-3 text-sm text-red-400"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          {state.error}
        </div>
      )}

      <div className="space-y-2">
        <Label
          htmlFor="name"
          className="text-xs font-medium tracking-wide text-slate-400 uppercase"
        >
          Full name
        </Label>
        <Input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          required
          placeholder="Jane Smith"
          className={INPUT_CLASSES}
        />
      </div>

      <div className="space-y-2">
        <Label
          htmlFor="email"
          className="text-xs font-medium tracking-wide text-slate-400 uppercase"
        >
          Email
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@company.com"
          className={INPUT_CLASSES}
        />
      </div>

      <div className="space-y-2">
        <Label
          htmlFor="password"
          className="text-xs font-medium tracking-wide text-slate-400 uppercase"
        >
          Password
        </Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={PASSWORD_MIN_LENGTH}
          placeholder="At least 8 characters"
          className={INPUT_CLASSES}
          onChange={handlePasswordChange}
        />

        {/* Password strength meter */}
        {strength !== "empty" && (
          <div className="flex items-center gap-3 pt-1">
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/[0.04]">
              <div
                className={`h-full rounded-full transition-all duration-500 ${STRENGTH_CONFIG[strength].bg} ${STRENGTH_CONFIG[strength].width}`}
              />
            </div>
            <div className="flex items-center gap-1">
              {strength === "strong" && (
                <Check className="size-3 text-emerald-400" />
              )}
              <span
                className={`text-xs font-medium ${STRENGTH_CONFIG[strength].color}`}
              >
                {STRENGTH_CONFIG[strength].label}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label
          htmlFor="orgName"
          className="text-xs font-medium tracking-wide text-slate-400 uppercase"
        >
          Organization
        </Label>
        <Input
          id="orgName"
          name="orgName"
          type="text"
          required
          placeholder="Acme Inc."
          className={INPUT_CLASSES}
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="group relative mt-2 flex h-11 w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-sm font-semibold text-white shadow-[0_0_24px_-6px_rgba(16,185,129,0.4)] transition-all duration-300 hover:shadow-[0_0_32px_-4px_rgba(16,185,129,0.5)] hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#030712] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
      >
        {/* Shimmer effect */}
        <div
          className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 group-hover:translate-x-full"
          aria-hidden="true"
        />
        {isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <>
            Create account
            <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          </>
        )}
      </button>
    </form>
  );
}
