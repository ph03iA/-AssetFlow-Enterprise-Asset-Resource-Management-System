"use client";

import {
  Bell,
  Buildings,
  CalendarBlank,
  ChartDonut,
  ClipboardText,
  Gauge,
  GearSix,
  Package,
  Scroll,
  Swap,
  Wrench,
} from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { hasPermission, type Permission } from "@/domain/permissions";
import { type Role } from "@/generated/prisma/enums";
import { cn } from "@/lib/cn";

const navigationItems: Array<{
  href: string;
  label: string;
  icon: typeof Gauge;
  permission?: Permission;
}> = [
  { href: "/dashboard", label: "Dashboard", icon: Gauge },
  { href: "/assets", label: "Assets", icon: Package, permission: "assets.read" },
  { href: "/allocations", label: "Allocations", icon: Swap, permission: "assets.read" },
  { href: "/bookings", label: "Bookings", icon: CalendarBlank, permission: "bookings.create" },
  { href: "/maintenance", label: "Maintenance", icon: Wrench },
  { href: "/audits", label: "Audits", icon: ClipboardText },
  { href: "/reports", label: "Reports", icon: ChartDonut },
  { href: "/organization", label: "Organization", icon: Buildings, permission: "organization.manage" },
  { href: "/notifications", label: "Notifications", icon: Bell, permission: "notifications.read-own" },
  { href: "/activity", label: "Activity log", icon: Scroll, permission: "activity.view" },
];

export function Navigation({
  role,
  unreadNotifications,
  mobile = false,
}: {
  role: Role;
  unreadNotifications: number;
  mobile?: boolean;
}) {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary navigation" className={cn("grid gap-1", mobile && "p-2")}>
      {navigationItems.map(({ href, label, icon: Icon, permission }) => {
        if (permission && !hasPermission(role, permission)) {
          return null;
        }

        if (
          href === "/reports" &&
          !hasPermission(role, "reports.view-organization") &&
          !hasPermission(role, "reports.view-department")
        ) {
          return null;
        }

        const active = pathname === href || pathname.startsWith(`${href}/`);
        const isNotificationLink = href === "/notifications";

        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group flex min-h-10 min-w-0 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-[background-color,color,transform] duration-200 active:translate-y-px",
              active
                ? "bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,.06)]"
                : "text-white/55 hover:bg-white/[0.06] hover:text-white/90",
              mobile &&
                (active
                  ? "bg-[#e8f0eb] text-[#285642]"
                  : "text-[#526158] hover:bg-[#edf1ed] hover:text-[#17211d]"),
            )}
          >
            <Icon
              className="size-[18px] shrink-0"
              weight={active ? "fill" : "regular"}
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1 truncate">{label}</span>
            {isNotificationLink && unreadNotifications > 0 ? (
              <span
                className={cn(
                  "grid min-w-5 place-items-center rounded-full px-1.5 py-0.5 font-mono text-[10px] font-bold",
                  mobile ? "bg-[#39755b] text-white" : "bg-[#a8d2b9] text-[#17231d]",
                )}
                aria-label={`${unreadNotifications} unread`}
              >
                {unreadNotifications > 99 ? "99+" : unreadNotifications}
              </span>
            ) : null}
          </Link>
        );
      })}
      <Link
        href="/account"
        className={cn(
          "mt-2 flex min-h-10 items-center gap-3 rounded-xl border-t px-3 pt-3 text-sm font-medium",
          mobile
            ? "border-[#dfe5e0] text-[#526158] hover:text-[#17211d]"
            : "border-white/10 text-white/55 hover:text-white/90",
        )}
      >
        <GearSix className="size-[18px]" aria-hidden="true" />
        Account settings
      </Link>
    </nav>
  );
}
