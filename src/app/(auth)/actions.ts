"use server";

import { redirect } from "next/navigation";

import {
  authenticateUser,
  registerEmployee,
  requestPasswordReset,
  resetPassword,
} from "@/server/auth/service";
import {
  createSession,
  destroyCurrentSession,
} from "@/server/auth/session";

export type AuthActionState = {
  success?: boolean;
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  values?: { name?: string; email?: string };
};

export async function loginAction(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const values = {
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  };
  const result = await authenticateUser(values);

  if (!result.success) {
    return {
      message: result.message,
      fieldErrors: result.fieldErrors,
      values: { email: values.email },
    };
  }

  await createSession(result.userId);
  redirect("/dashboard");
}

export async function signupAction(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const values = {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  };
  const result = await registerEmployee(values);

  if (!result.success) {
    return {
      message: result.message,
      fieldErrors: result.fieldErrors,
      values: { name: values.name, email: values.email },
    };
  }

  await createSession(result.userId);
  redirect("/dashboard");
}

export async function forgotPasswordAction(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "");
  const result = await requestPasswordReset({ email });

  if (!result.success) {
    return {
      message: result.message,
      fieldErrors: result.fieldErrors,
      values: { email },
    };
  }

  return {
    success: true,
    message:
      "If an active account matches that email, a reset link is now available in the development mailbox.",
    values: { email },
  };
}

export async function resetPasswordAction(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const result = await resetPassword({
    token: String(formData.get("token") ?? ""),
    password: String(formData.get("password") ?? ""),
  });

  if (!result.success) {
    return { message: result.message, fieldErrors: result.fieldErrors };
  }

  await createSession(result.userId);
  redirect("/dashboard");
}

export async function logoutAction() {
  await destroyCurrentSession();
  redirect("/login");
}
