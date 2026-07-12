"use client";

import { ArrowRight } from "@phosphor-icons/react";
import { useActionState } from "react";

import {
  forgotPasswordAction,
  type AuthActionState,
} from "@/app/(auth)/actions";
import { FormFeedback } from "@/components/auth/form-feedback";
import { Button } from "@/components/ui/button";
import { InputField } from "@/components/ui/field";

const initialState: AuthActionState = {};

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(
    forgotPasswordAction,
    initialState,
  );

  return (
    <form action={formAction} className="grid gap-5" noValidate>
      <FormFeedback message={state.message} success={state.success} />
      <InputField
        label="Work email"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="name@organization.com"
        defaultValue={state.values?.email}
        error={state.fieldErrors?.email?.[0]}
        required
      />
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Preparing reset link..." : "Request reset link"}
        <ArrowRight className="size-4" weight="bold" aria-hidden="true" />
      </Button>
    </form>
  );
}
