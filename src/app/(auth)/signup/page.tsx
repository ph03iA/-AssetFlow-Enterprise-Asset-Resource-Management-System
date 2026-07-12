import type { Metadata } from "next";
import Link from "next/link";

import { AuthPanel } from "@/components/auth/auth-panel";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata: Metadata = { title: "Create account" };

export default function SignupPage() {
  return (
    <AuthPanel
      eyebrow="Employee access"
      title="Join your organization."
      description="Create your Employee account. Department placement and elevated responsibilities remain Admin-controlled."
      footer={
        <p>
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-[#39755b] underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </p>
      }
    >
      <SignupForm />
    </AuthPanel>
  );
}
