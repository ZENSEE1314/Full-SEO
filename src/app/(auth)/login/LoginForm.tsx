"use client";

import { useActionState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface LoginFormProps {
  action: (
    prevState: { error: string } | null,
    formData: FormData,
  ) => Promise<{ error: string }>;
}

export function LoginForm({ action }: LoginFormProps) {
  const [state, formAction, isPending] = useActionState(action, null);

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <div
          role="alert"
          className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400"
        >
          {state.error}
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="email" className="text-slate-300">
          Email
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@company.com"
          className="h-10 border-white/10 bg-white/5 text-white placeholder:text-slate-500 focus-visible:border-emerald-500/50 focus-visible:ring-emerald-500/20"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password" className="text-slate-300">
          Password
        </Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="Enter your password"
          className="h-10 border-white/10 bg-white/5 text-white placeholder:text-slate-500 focus-visible:border-emerald-500/50 focus-visible:ring-emerald-500/20"
        />
      </div>

      <Button
        type="submit"
        disabled={isPending}
        className="h-10 w-full bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-60"
      >
        {isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <>
            Sign in
            <ArrowRight className="size-4" />
          </>
        )}
      </Button>
    </form>
  );
}
