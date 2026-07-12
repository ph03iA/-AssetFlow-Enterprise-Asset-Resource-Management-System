import type { ReactNode } from "react";

import { AppShell } from "@/components/app/app-shell";
import { requireUser } from "@/server/auth/session";
import { db } from "@/server/db";

export const dynamic = "force-dynamic";

export default async function ProtectedAppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireUser();
  const unreadNotifications = await db.notification.count({
    where: { userId: user.id, readAt: null },
  });

  return (
    <AppShell user={user} unreadNotifications={unreadNotifications}>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-bold"
      >
        Skip to main content
      </a>
      {children}
    </AppShell>
  );
}
