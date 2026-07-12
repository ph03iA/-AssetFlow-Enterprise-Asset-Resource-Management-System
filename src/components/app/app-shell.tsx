import {
  Bell,
  CaretDown,
  List,
  MagnifyingGlass,
  SignOut,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import type { ReactNode } from "react";

import { logoutAction } from "@/app/(auth)/actions";
import { type Role } from "@/generated/prisma/enums";
import { Navigation } from "./navigation";

const roleLabels: Record<Role, string> = {
  ADMIN: "Administrator",
  ASSET_MANAGER: "Asset Manager",
  DEPARTMENT_HEAD: "Department Head",
  EMPLOYEE: "Employee",
};

type AppShellUser = {
  name: string;
  email: string;
  role: Role;
  avatarColor: string;
  department: { name: string } | null;
  organization: { name: string };
};

export function AppShell({
  user,
  unreadNotifications,
  children,
}: {
  user: AppShellUser;
  unreadNotifications: number;
  children: ReactNode;
}) {
  const initials = user.name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-[100dvh] bg-[#f4f6f3] text-[#17211d] lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-[100dvh] min-h-0 flex-col bg-[#17231d] px-3 py-4 text-white lg:flex">
        <Link href="/dashboard" className="mx-2 flex min-h-12 items-center gap-3 px-1">
          <span className="grid size-9 place-items-center rounded-xl border border-white/15 bg-white/10 font-mono text-xs font-bold text-[#a8d2b9] shadow-[inset_0_1px_0_rgba(255,255,255,.08)]">
            AF
          </span>
          <span>
            <span className="block font-bold tracking-[-0.025em]">AssetFlow</span>
            <span className="block max-w-36 truncate font-mono text-[9px] uppercase tracking-[0.12em] text-white/35">
              {user.organization.name}
            </span>
          </span>
        </Link>

        <div className="my-5 h-px bg-white/[0.08]" />
        <div className="min-h-0 flex-1 overflow-y-auto px-1">
          <Navigation role={user.role} unreadNotifications={unreadNotifications} />
        </div>

        <div className="mt-4 border-t border-white/[0.08] px-2 pt-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#a8d2b9] text-xs font-bold text-[#17231d]">
              {initials}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{user.name}</span>
              <span className="block truncate text-[11px] text-white/40">
                {roleLabels[user.role]}
              </span>
            </span>
            <form action={logoutAction}>
              <button
                type="submit"
                title="Sign out"
                className="grid size-9 place-items-center rounded-lg text-white/45 transition-colors hover:bg-white/[0.08] hover:text-white"
              >
                <SignOut className="size-[18px]" aria-hidden="true" />
                <span className="sr-only">Sign out</span>
              </button>
            </form>
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex min-h-16 items-center gap-3 border-b border-[#dce3dc] bg-[#f4f6f3]/95 px-4 backdrop-blur-sm sm:px-6 lg:px-8">
          <details className="group relative lg:hidden">
            <summary className="grid size-10 cursor-pointer list-none place-items-center rounded-xl border border-[#d1d9d3] bg-white text-[#405047] [&::-webkit-details-marker]:hidden">
              <List className="size-5" weight="bold" aria-hidden="true" />
              <span className="sr-only">Open navigation</span>
            </summary>
            <div className="absolute left-0 top-12 w-[min(86vw,320px)] rounded-2xl border border-[#d5ddd7] bg-white p-2 shadow-[0_24px_64px_-28px_rgba(23,35,29,.45)]">
              <div className="mb-2 flex items-center gap-3 border-b border-[#e0e6e1] px-2 py-3">
                <span className="grid size-8 place-items-center rounded-lg bg-[#17231d] font-mono text-[10px] font-bold text-[#a8d2b9]">
                  AF
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">AssetFlow</p>
                  <p className="truncate text-[11px] text-[#718078]">
                    {user.organization.name}
                  </p>
                </div>
              </div>
              <Navigation
                role={user.role}
                unreadNotifications={unreadNotifications}
                mobile
              />
            </div>
          </details>

          <button
            type="button"
            className="hidden min-h-10 min-w-0 max-w-md flex-1 items-center gap-2.5 rounded-xl border border-[#d1d9d3] bg-white px-3.5 text-left text-sm text-[#7a877f] transition-colors hover:border-[#b8c4bb] sm:flex"
          >
            <MagnifyingGlass className="size-4" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate">Search assets, people, or tags</span>
            <kbd className="rounded-md border border-[#dce2dd] bg-[#f2f4f2] px-1.5 py-0.5 font-mono text-[9px] text-[#77837c]">
              Ctrl K
            </kbd>
          </button>

          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/notifications"
              className="relative grid size-10 place-items-center rounded-xl border border-[#d1d9d3] bg-white text-[#4c5c53] transition-colors hover:border-[#b8c4bb] hover:text-[#17211d]"
            >
              <Bell className="size-[18px]" aria-hidden="true" />
              <span className="sr-only">Notifications</span>
              {unreadNotifications > 0 ? (
                <span className="absolute right-2 top-2 size-2 rounded-full border-2 border-white bg-[#a34343]" />
              ) : null}
            </Link>
            <details className="group relative">
              <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-xl border border-transparent px-1.5 hover:border-[#d1d9d3] hover:bg-white [&::-webkit-details-marker]:hidden">
                <span className="grid size-8 place-items-center rounded-lg bg-[#d7e8dd] text-[11px] font-bold text-[#285642]">
                  {initials}
                </span>
                <span className="hidden min-w-0 text-left xl:block">
                  <span className="block max-w-32 truncate text-xs font-bold">{user.name}</span>
                  <span className="block max-w-32 truncate text-[10px] text-[#75827a]">
                    {user.department?.name ?? roleLabels[user.role]}
                  </span>
                </span>
                <CaretDown className="hidden size-3 text-[#718078] xl:block" aria-hidden="true" />
              </summary>
              <div className="absolute right-0 top-12 w-56 rounded-2xl border border-[#d5ddd7] bg-white p-2 shadow-[0_24px_64px_-28px_rgba(23,35,29,.45)]">
                <div className="px-3 py-2">
                  <p className="truncate text-sm font-bold">{user.name}</p>
                  <p className="truncate text-xs text-[#718078]">{user.email}</p>
                </div>
                <div className="my-1 h-px bg-[#e3e8e4]" />
                <Link
                  href="/account"
                  className="block rounded-lg px-3 py-2 text-sm font-medium text-[#526158] hover:bg-[#edf1ed]"
                >
                  Account settings
                </Link>
                <form action={logoutAction}>
                  <button
                    type="submit"
                    className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-[#963f3f] hover:bg-[#fff1f1]"
                  >
                    Sign out
                  </button>
                </form>
              </div>
            </details>
          </div>
        </header>

        <main id="main-content" className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-[1400px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
