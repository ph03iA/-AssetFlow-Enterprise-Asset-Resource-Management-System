import type { ReactNode } from "react";

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="grid min-h-64 place-items-center rounded-2xl border border-dashed border-[#cfd8d1] bg-white/60 px-6 py-12 text-center">
      <div className="grid max-w-sm justify-items-center">
        <div className="mb-5 grid size-11 place-items-center rounded-xl border border-[#d7dfd8] bg-[#edf2ee] text-[#39755b]">
          {icon}
        </div>
        <h2 className="text-base font-bold tracking-tight text-[#202c25]">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#68766d]">{description}</p>
        {action ? <div className="mt-5">{action}</div> : null}
      </div>
    </div>
  );
}
