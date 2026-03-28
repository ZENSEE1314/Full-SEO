export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="dark relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-slate-950 px-4">
      {/* Mesh gradient background */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
      >
        <div className="absolute -left-1/4 -top-1/4 h-[600px] w-[600px] rounded-full bg-emerald-500/8 blur-[120px]" />
        <div className="absolute -bottom-1/4 -right-1/4 h-[500px] w-[500px] rounded-full bg-emerald-600/6 blur-[100px]" />
        <div className="absolute left-1/2 top-1/3 h-[300px] w-[300px] -translate-x-1/2 rounded-full bg-cyan-500/4 blur-[80px]" />
      </div>

      {/* Subtle grid pattern overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        aria-hidden="true"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      {/* Logo */}
      <div className="relative z-10 mb-8 flex items-baseline gap-0.5 select-none">
        <span className="text-3xl font-extrabold tracking-tight text-white">
          NEXUS
        </span>
        <span className="text-3xl font-extrabold tracking-tight text-emerald-400">
          SEO
        </span>
      </div>

      {/* Page content (login/signup card) */}
      <div className="relative z-10 w-full max-w-md">{children}</div>

      {/* Footer */}
      <p className="relative z-10 mt-8 text-xs text-slate-500">
        &copy; {new Date().getFullYear()} NEXUS SEO. All rights reserved.
      </p>
    </div>
  );
}
