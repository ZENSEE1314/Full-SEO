import { Activity, BrainCircuit, Radio, Zap } from "lucide-react";

const FEATURES = [
  {
    icon: Radio,
    title: "Real-time Intelligence",
    description: "Monitor SERP movements and competitor shifts as they happen",
  },
  {
    icon: BrainCircuit,
    title: "AI Content Engine",
    description: "Generate search-optimized content that outranks the competition",
  },
  {
    icon: Zap,
    title: "Automated Outreach",
    description: "Build authority with intelligent link acquisition at scale",
  },
] as const;

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="dark relative flex min-h-dvh overflow-hidden bg-[#030712]">
      {/* --- Animated background layer --- */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        {/* Primary orb */}
        <div className="absolute -left-32 top-1/4 h-[600px] w-[600px] animate-[orb-drift_12s_ease-in-out_infinite] rounded-full bg-emerald-500/[0.07] blur-[140px]" />
        {/* Secondary orb */}
        <div className="absolute -right-24 bottom-1/4 h-[500px] w-[500px] animate-[orb-drift-reverse_15s_ease-in-out_infinite] rounded-full bg-cyan-500/[0.05] blur-[120px]" />
        {/* Tertiary accent */}
        <div className="absolute left-1/2 top-0 h-[300px] w-[400px] -translate-x-1/2 animate-[orb-drift_18s_ease-in-out_infinite] rounded-full bg-emerald-400/[0.04] blur-[100px]" />

        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)",
            backgroundSize: "72px 72px",
          }}
        />

        {/* Scan line effect */}
        <div className="absolute inset-x-0 h-px animate-[scan-line_8s_linear_infinite] bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
      </div>

      {/* --- Left hero panel (hidden on mobile, shown lg+) --- */}
      <div className="relative hidden w-[52%] flex-col justify-between p-12 lg:flex xl:p-16">
        <div className="animate-[auth-hero-enter_0.6s_cubic-bezier(0.16,1,0.3,1)_both]">
          {/* Logo */}
          <div className="flex items-baseline gap-1 select-none">
            <span className="font-display text-4xl font-extrabold tracking-tight text-white">
              NEXUS
            </span>
            <span className="font-display text-4xl font-extrabold tracking-tight text-emerald-400 animate-[glow-pulse_3s_ease-in-out_infinite]">
              SEO
            </span>
          </div>

          {/* Tagline */}
          <p className="mt-4 font-display text-lg font-medium tracking-wide text-slate-400">
            Autonomous Search Dominance
          </p>
        </div>

        {/* Features */}
        <div className="flex flex-col gap-8">
          {FEATURES.map((feature, i) => (
            <div
              key={feature.title}
              className="flex items-start gap-4"
              style={{
                animation: `feature-stagger 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${300 + i * 120}ms both`,
              }}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/[0.08]">
                <feature.icon className="size-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">
                  {feature.title}
                </h3>
                <p className="mt-0.5 text-sm leading-relaxed text-slate-500">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Abstract data visualization */}
        <div className="flex items-end gap-3" aria-hidden="true">
          {/* Animated dot cluster */}
          <svg
            viewBox="0 0 200 48"
            fill="none"
            className="h-12 w-52 text-emerald-500/30"
          >
            {Array.from({ length: 20 }).map((_, i) => (
              <circle
                key={i}
                cx={10 + i * 10}
                cy={24 + Math.sin(i * 0.8) * 12}
                r={1.5 + Math.sin(i * 0.5) * 1}
                fill="currentColor"
                style={{
                  animation: `dot-float ${1.5 + (i % 4) * 0.3}s ease-in-out ${i * 0.1}s infinite`,
                }}
              />
            ))}
            {/* Connecting line */}
            <path
              d={`M ${Array.from({ length: 20 })
                .map(
                  (_, i) =>
                    `${10 + i * 10},${24 + Math.sin(i * 0.8) * 12}`,
                )
                .join(" L ")}`}
              stroke="currentColor"
              strokeWidth="0.5"
              opacity="0.4"
            />
          </svg>
          <div className="flex items-center gap-1.5">
            <Activity className="size-3.5 text-emerald-500/40" />
            <span className="font-mono text-[10px] tracking-wider text-slate-600">
              LIVE
            </span>
          </div>
        </div>
      </div>

      {/* --- Right content panel --- */}
      <div className="relative flex w-full flex-col items-center justify-center px-6 py-12 lg:w-[48%] lg:px-16">
        {/* Separator line on desktop */}
        <div
          className="absolute left-0 top-[10%] hidden h-[80%] w-px bg-gradient-to-b from-transparent via-white/[0.06] to-transparent lg:block"
          aria-hidden="true"
        />

        {/* Mobile logo (shown below lg) */}
        <div className="mb-10 flex items-baseline gap-1 select-none lg:hidden">
          <span className="font-display text-3xl font-extrabold tracking-tight text-white">
            NEXUS
          </span>
          <span className="font-display text-3xl font-extrabold tracking-tight text-emerald-400">
            SEO
          </span>
        </div>

        {/* Card area */}
        <div className="w-full max-w-[420px] animate-[auth-card-enter_0.7s_cubic-bezier(0.16,1,0.3,1)_both]">
          {children}
        </div>

        {/* Footer */}
        <p className="mt-10 text-xs text-slate-600">
          &copy; {new Date().getFullYear()} NEXUS SEO. All rights reserved.
        </p>
      </div>
    </div>
  );
}
