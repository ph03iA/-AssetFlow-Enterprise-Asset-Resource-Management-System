"use client";

import { ArrowRight } from "@phosphor-icons/react";
import { useActionState } from "react";

import {
  resetPasswordAction,
  type AuthActionState,
} from "@/app/(auth)/actions";
import { FormFeedback } from "@/components/auth/form-feedback";
import { Button } from "@/components/ui/button";
import { InputField } from "@/components/ui/field";

const initialState: AuthActionState = {};

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(
    resetPasswordAction,
    initialState,
  );

  return (
    <form action={formAction} className="grid gap-5" noValidate>
      <FormFeedback message={state.message} />
      <input type="hidden" name="token" value={token} />
      <InputField
        label="New password"
        name="password"
        type="password"
        autoComplete="new-password"
        placeholder="Create a new password"
        hint="At least 12 characters with uppercase, lowercase, number, and symbol."
        error={state.fieldErrors?.password?.[0]}
        required
      />
      <Button type="submit" className="w-full" disabled={pending || !token}>
        {pending ? "Updating password..." : "Set new password"}
        <ArrowRight className="size-4" weight="bold" aria-hidden="true" />
      </Button>
    </form>
  );
}
