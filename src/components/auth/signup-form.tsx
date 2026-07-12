"use client";

import { ArrowRight } from "@phosphor-icons/react";
import { useActionState } from "react";

import { signupAction, type AuthActionState } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { InputField } from "@/components/ui/field";
import { FormFeedback } from "./form-feedback";

const initialState: AuthActionState = {};

export function SignupForm() {
  const [state, formAction, pending] = useActionState(
    signupAction,
    initialState,
  );

  return (
    <form action={formAction} className="grid gap-5" noValidate>
      <FormFeedback message={state.message} />
      <InputField
        label="Full name"
        name="name"
        autoComplete="name"
        placeholder="Your full name"
        defaultValue={state.values?.name}
        error={state.fieldErrors?.name?.[0]}
        required
      />
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
      <InputField
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        placeholder="Create a strong password"
        hint="At least 12 characters with uppercase, lowercase, number, and symbol."
        error={state.fieldErrors?.password?.[0]}
        required
      />
      <div className="rounded-xl border border-[#d8e0da] bg-[#edf2ee] px-3.5 py-3 text-xs leading-5 text-[#5e6c64]">
        New accounts always start as Employees. An Admin can later assign Asset
        Manager or Department Head access from the Employee Directory.
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Creating employee account..." : "Create employee account"}
        <ArrowRight className="size-4" weight="bold" aria-hidden="true" />
      </Button>
    </form>
  );
}
