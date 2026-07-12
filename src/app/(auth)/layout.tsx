import {
  Buildings,
  CalendarCheck,
  ShieldCheck,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import type { ReactNode } from "react";

const capabilities = [
  {
    icon: Buildings,
    title: "One operational record",
    description: "Assets, holders, locations, condition, and history stay connected.",
  },
  {
    icon: CalendarCheck,
    title: "Conflict-free resources",
    description: "Book shared rooms, vehicles, and equipment without overlaps.",
  },
  {
    icon: ShieldCheck,
    title: "Role-controlled workflows",
    description: "Every approval is scoped, attributed, and retained for audit.",
  },
] as const;

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="grid min-h-[100dvh] bg-[#f4f6f3] lg:grid-cols-[minmax(0,0.82fr)_minmax(520px,1.18fr)]">
      <aside className="relative hidden overflow-hidden bg-[#17231d] px-10 py-10 text-white lg:flex lg:min-h-[100dvh] lg:flex-col xl:px-16 xl:py-14">
        <div
          className="pointer-events-none absolute inset-0 opacity-35"
          aria-hidden="true"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <Link href="/" className="relative inline-flex items-center gap-3 self-start">
          <span className="grid size-9 place-items-center rounded-xl border border-white/15 bg-white/10 font-mono text-sm font-bold text-[#a8d2b9] shadow-[inset_0_1px_0_rgba(255,255,255,.08)]">
            AF
          </span>
          <span className="text-lg font-bold tracking-[-0.025em]">AssetFlow</span>
        </Link>

        <div className="relative my-auto max-w-lg py-16">
          <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-[#8fbda2]">
            Operations, without blind spots
          </p>
          <h2 className="mt-5 text-4xl font-semibold leading-[1.08] tracking-[-0.045em] xl:text-5xl">
            Know what exists, who holds it, and what happens next.
          </h2>
          <div className="mt-12 grid gap-7">
            {capabilities.map(({ icon: Icon, title, description }) => (
              <div key={title} className="grid grid-cols-[36px_1fr] gap-4">
                <div className="grid size-9 place-items-center rounded-lg border border-white/10 bg-white/[0.06] text-[#a8d2b9]">
                  <Icon className="size-[18px]" weight="duotone" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">{title}</h3>
                  <p className="mt-1 max-w-sm text-sm leading-6 text-white/55">
                    {description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative font-mono text-[10px] uppercase tracking-[0.18em] text-white/35">
          Enterprise asset & resource management
        </p>
      </aside>

      <section className="flex min-h-[100dvh] min-w-0 flex-col">
        <header className="flex items-center justify-between border-b border-[#dde3de] px-5 py-4 lg:hidden">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-lg bg-[#17231d] font-mono text-xs font-bold text-[#a8d2b9]">
              AF
            </span>
            <span className="font-bold tracking-tight">AssetFlow</span>
          </Link>
          <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#728078]">
            Northstar Works
          </span>
        </header>
        <div className="flex flex-1 items-center px-5 py-12 sm:px-10 lg:px-[clamp(4rem,9vw,9rem)] lg:py-16">
          {children}
        </div>
      </section>
    </main>
  );
}
