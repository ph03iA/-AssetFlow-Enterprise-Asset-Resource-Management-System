import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { UserStatus } from "@/generated/prisma/enums";
import { canAct, type Permission } from "@/domain/permissions";
import { db } from "@/server/db";
import {
  expiresAfter,
  generateOpaqueToken,
  hashToken,
  SESSION_DURATION_MS,
} from "./tokens";

export const SESSION_COOKIE_NAME = "assetflow_session";

function cookieIsSecure() {
  return (
    process.env.SESSION_COOKIE_SECURE === "true" ||
    process.env.NODE_ENV === "production"
  );
}

export async function createSession(userId: string) {
  const token = generateOpaqueToken();
  const expiresAt = expiresAfter(SESSION_DURATION_MS);

  await db.session.create({
    data: {
      tokenHash: hashToken(token),
      userId,
      expiresAt,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: cookieIsSecure(),
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
    priority: "high",
  });
}

export const getCurrentUser = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    select: {
      id: true,
      expiresAt: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          organizationId: true,
          departmentId: true,
          avatarColor: true,
          organization: {
            select: {
              name: true,
              timezone: true,
              currency: true,
            },
          },
          department: {
            select: { id: true, name: true },
          },
        },
      },
    },
  });

  if (!session) {
    return null;
  }

  if (
    session.expiresAt <= new Date() ||
    session.user.status !== UserStatus.ACTIVE
  ) {
    await db.session.deleteMany({ where: { id: session.id } });
    return null;
  }

  return session.user;
});

export async function destroyCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  }

  cookieStore.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: cookieIsSecure(),
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requirePermission(permission: Permission) {
  const user = await requireUser();

  if (!canAct(user, permission)) {
    redirect("/forbidden");
  }

  return user;
}
