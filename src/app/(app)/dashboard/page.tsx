import type { Metadata } from "next";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <div>
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-[#39755b]">
        Operational overview
      </p>
      <h1 className="mt-3 text-3xl font-bold tracking-[-0.04em] text-[#17211d]">
        Dashboard
      </h1>
      <p className="mt-2 text-sm leading-6 text-[#68766d]">
        Live organization metrics and workflow queues will appear here.
      </p>
    </div>
  );
}
