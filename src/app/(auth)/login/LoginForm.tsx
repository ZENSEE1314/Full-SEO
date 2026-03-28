"use client";

import { useActionState } from "react";
import { ArrowRight, Loader2, AlertCircle } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface LoginFormProps {
  action: (
    prevState: { error: string } | null,
    formData: FormData,
  ) => Promise<{ error: string }>;
}

export function LoginForm({ action }: LoginFormProps) {
  const [state, formAction, isPending] = useActionState(action, null);

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
        <Label htmlFor="email" className="text-xs font-medium tracking-wide text-slate-400 uppercase">
          Email
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@company.com"
          className="h-11 rounded-xl border-white/[0.06] bg-white/[0.03] px-4 text-sm text-white placeholder:text-slate-600 transition-all duration-200 focus-visible:border-emerald-500/40 focus-visible:bg-white/[0.05] focus-visible:ring-2 focus-visible:ring-emerald-500/15 focus-visible:shadow-[0_0_20px_-4px_rgba(16,185,129,0.15)]"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password" className="text-xs font-medium tracking-wide text-slate-400 uppercase">
            Password
          </Label>
          <button
            type="button"
            className="text-xs text-slate-600 transition-colors hover:text-emerald-400"
            tabIndex={-1}
          >
            Forgot password?
          </button>
        </div>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="Enter your password"
          className="h-11 rounded-xl border-white/[0.06] bg-white/[0.03] px-4 text-sm text-white placeholder:text-slate-600 transition-all duration-200 focus-visible:border-emerald-500/40 focus-visible:bg-white/[0.05] focus-visible:ring-2 focus-visible:ring-emerald-500/15 focus-visible:shadow-[0_0_20px_-4px_rgba(16,185,129,0.15)]"
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
            Sign in
            <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          </>
        )}
      </button>
    </form>
  );
}
