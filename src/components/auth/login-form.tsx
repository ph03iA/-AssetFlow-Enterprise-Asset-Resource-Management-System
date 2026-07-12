"use client";

import { ArrowRight } from "@phosphor-icons/react";
import Link from "next/link";
import { useActionState } from "react";

import { loginAction, type AuthActionState } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { InputField } from "@/components/ui/field";
import { FormFeedback } from "./form-feedback";

const initialState: AuthActionState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(
    loginAction,
    initialState,
  );

  return (
    <form action={formAction} className="grid gap-5" noValidate>
      <FormFeedback message={state.message} />
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
      <div className="grid gap-2">
        <InputField
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="Enter your password"
          error={state.fieldErrors?.password?.[0]}
          required
        />
        <Link
          href="/forgot-password"
          className="justify-self-end text-xs font-semibold text-[#39755b] underline-offset-4 hover:underline"
        >
          Forgot password?
        </Link>
      </div>
      <Button type="submit" className="mt-1 w-full" disabled={pending}>
        {pending ? "Validating account..." : "Sign in"}
        <ArrowRight className="size-4" weight="bold" aria-hidden="true" />
      </Button>
    </form>
  );
}
