import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";
import Link from "next/link";

import { AuthPanel } from "@/components/auth/auth-panel";
import { FormFeedback } from "@/components/auth/form-feedback";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = { title: "Choose new password" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token = "" } = await searchParams;

  return (
    <AuthPanel
      eyebrow="Account recovery"
      title="Choose a new password."
      description="The reset link is single-use and expires after 30 minutes. Completing it signs out every existing session."
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
      {!token ? (
        <div className="mb-5">
          <FormFeedback message="This reset link is missing its token. Request a new link and try again." />
        </div>
      ) : null}
      <ResetPasswordForm token={token} />
    </AuthPanel>
  );
}
