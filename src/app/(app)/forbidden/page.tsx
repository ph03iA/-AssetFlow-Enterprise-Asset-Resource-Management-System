import { LockKey } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <div className="grid min-h-[60dvh] place-items-center text-center">
      <div className="max-w-md">
        <div className="mx-auto grid size-12 place-items-center rounded-2xl border border-[#d5ddd7] bg-white text-[#39755b]">
          <LockKey className="size-5" weight="duotone" aria-hidden="true" />
        </div>
        <h1 className="mt-5 text-2xl font-bold tracking-tight">Access is restricted</h1>
        <p className="mt-2 text-sm leading-6 text-[#68766d]">
          Your current role does not permit this action or record. If your
          responsibilities changed, ask an Admin to review your access.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex min-h-10 items-center rounded-xl bg-[#39755b] px-4 text-sm font-semibold text-white hover:bg-[#285642]"
        >
          Return to dashboard
        </Link>
      </div>
    </div>
  );
}
