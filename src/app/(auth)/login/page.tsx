import type { Metadata } from "next";
import Link from "next/link";

import { AuthPanel } from "@/components/auth/auth-panel";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <AuthPanel
      eyebrow="Secure workspace"
      title="Welcome back."
      description="Sign in to review assets, resolve operational requests, and keep shared resources moving."
      footer={
        <p>
          New to AssetFlow?{" "}
          <Link
            href="/signup"
            className="font-semibold text-[#39755b] underline-offset-4 hover:underline"
          >
            Create an Employee account
          </Link>
        </p>
      }
    >
      <LoginForm />
    </AuthPanel>
  );
}
