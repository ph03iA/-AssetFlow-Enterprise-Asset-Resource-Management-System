import "server-only";

import {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  signupSchema,
} from "@/domain/auth-inputs";
import { Role, UserStatus } from "@/generated/prisma/enums";
import { db } from "@/server/db";
import { hashPassword, verifyPassword } from "./passwords";
import {
  expiresAfter,
  generateOpaqueToken,
  hashToken,
  PASSWORD_RESET_DURATION_MS,
} from "./tokens";

type FieldErrors = Record<string, string[] | undefined>;

type AuthFailure = {
  success: false;
  message: string;
  fieldErrors?: FieldErrors;
};

export type AuthServiceResult<T extends object = object> =
  | ({ success: true } & T)
  | AuthFailure;

function validationFailure(
  fieldErrors: FieldErrors,
): AuthFailure {
  return {
    success: false,
    message: "Review the highlighted fields and try again.",
    fieldErrors,
  };
}

export async function registerEmployee(
  input: unknown,
): Promise<AuthServiceResult<{ userId: string }>> {
  const parsed = signupSchema.safeParse(input);

  if (!parsed.success) {
    return validationFailure(parsed.error.flatten().fieldErrors);
  }

  const organization = await db.organization.findUnique({
    where: {
      slug: process.env.DEFAULT_ORGANIZATION_SLUG ?? "northstar-works",
    },
    select: { id: true },
  });

  if (!organization) {
    return {
      success: false,
      message: "Account creation is not configured for this organization.",
    };
  }

  const existingUser = await db.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true },
  });

  if (existingUser) {
    return {
      success: false,
      message: "An account already exists for this email address.",
      fieldErrors: { email: ["Use a different email or sign in."] },
    };
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const user = await db.$transaction(async (transaction) => {
    const createdUser = await transaction.user.create({
      data: {
        organizationId: organization.id,
        name: parsed.data.name,
        email: parsed.data.email,
        passwordHash,
        role: Role.EMPLOYEE,
        status: UserStatus.ACTIVE,
      },
      select: { id: true },
    });

    await transaction.activityLog.create({
      data: {
        organizationId: organization.id,
        actorId: createdUser.id,
        action: "user.signed_up",
        entityType: "user",
        entityId: createdUser.id,
      },
    });

    return createdUser;
  });

  return { success: true, userId: user.id };
}

export async function authenticateUser(
  input: unknown,
): Promise<AuthServiceResult<{ userId: string }>> {
  const parsed = loginSchema.safeParse(input);

  if (!parsed.success) {
    return validationFailure(parsed.error.flatten().fieldErrors);
  }

  const user = await db.user.findUnique({
    where: { email: parsed.data.email },
    select: {
      id: true,
      organizationId: true,
      passwordHash: true,
      status: true,
    },
  });

  if (
    !user ||
    user.status !== UserStatus.ACTIVE ||
    !(await verifyPassword(parsed.data.password, user.passwordHash))
  ) {
    return {
      success: false,
      message: "Email or password is incorrect, or the account is inactive.",
    };
  }

  await db.$transaction([
    db.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    }),
    db.activityLog.create({
      data: {
        organizationId: user.organizationId,
        actorId: user.id,
        action: "auth.login",
        entityType: "user",
        entityId: user.id,
      },
    }),
  ]);

  return { success: true, userId: user.id };
}

export async function requestPasswordReset(
  input: unknown,
): Promise<AuthServiceResult> {
  const parsed = forgotPasswordSchema.safeParse(input);

  if (!parsed.success) {
    return validationFailure(parsed.error.flatten().fieldErrors);
  }

  const user = await db.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true, status: true },
  });

  if (!user || user.status !== UserStatus.ACTIVE) {
    return { success: true };
  }

  const token = generateOpaqueToken();
  const expiresAt = expiresAfter(PASSWORD_RESET_DURATION_MS);

  await db.$transaction([
    db.passwordResetToken.deleteMany({
      where: { userId: user.id, usedAt: null },
    }),
    db.passwordResetToken.create({
      data: { userId: user.id, tokenHash: hashToken(token), expiresAt },
    }),
    db.mailOutbox.create({
      data: {
        userId: user.id,
        recipient: parsed.data.email,
        subject: "Reset your AssetFlow password",
        body: `Open /reset-password?token=${token} before ${expiresAt.toISOString()}.`,
      },
    }),
  ]);

  return { success: true };
}

export async function resetPassword(
  input: unknown,
): Promise<AuthServiceResult<{ userId: string }>> {
  const parsed = resetPasswordSchema.safeParse(input);

  if (!parsed.success) {
    return validationFailure(parsed.error.flatten().fieldErrors);
  }

  const now = new Date();
  const tokenHash = hashToken(parsed.data.token);
  const resetToken = await db.passwordResetToken.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      userId: true,
      expiresAt: true,
      usedAt: true,
      user: { select: { organizationId: true, status: true } },
    },
  });

  if (
    !resetToken ||
    resetToken.usedAt ||
    resetToken.expiresAt <= now ||
    resetToken.user.status !== UserStatus.ACTIVE
  ) {
    return {
      success: false,
      message: "This password reset link is invalid or has expired.",
    };
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const updated = await db.$transaction(async (transaction) => {
    const claimed = await transaction.passwordResetToken.updateMany({
      where: { id: resetToken.id, usedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now },
    });

    if (claimed.count !== 1) {
      return false;
    }

    await transaction.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash },
    });
    await transaction.session.deleteMany({
      where: { userId: resetToken.userId },
    });
    await transaction.activityLog.create({
      data: {
        organizationId: resetToken.user.organizationId,
        actorId: resetToken.userId,
        action: "auth.password_reset",
        entityType: "user",
        entityId: resetToken.userId,
      },
    });

    return true;
  });

  if (!updated) {
    return {
      success: false,
      message: "This password reset link has already been used.",
    };
  }

  return { success: true, userId: resetToken.userId };
}
