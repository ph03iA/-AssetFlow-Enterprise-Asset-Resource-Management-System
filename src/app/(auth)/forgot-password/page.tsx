import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";
import Link from "next/link";

import { AuthPanel } from "@/components/auth/auth-panel";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return (
    <AuthPanel
      eyebrow="Account recovery"
      title="Reset your password."
      description="Enter your work email. For this local demonstration, reset messages are retained in the development mailbox."
      footer={
        <Link
          href="/login"
          className="inline-flex items-center gap-2 font-semibold text-[#39755b] underline-offset-4 hover:underline"
        >
          <ArrowLeft className="size-4" weight="bold" aria-hidden="true" />
          Back to sign in
        </Link>
      }
    >
      <ForgotPasswordForm />
    </AuthPanel>
  );
}
