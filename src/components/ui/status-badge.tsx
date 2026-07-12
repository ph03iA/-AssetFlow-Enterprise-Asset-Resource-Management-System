import { cn } from "@/lib/cn";

type StatusTone = "neutral" | "success" | "warning" | "danger" | "info";

const tones: Record<StatusTone, string> = {
  neutral: "border-[#d9dfda] bg-[#f3f5f3] text-[#5c6961]",
  success: "border-[#bdd6c7] bg-[#edf7f1] text-[#2f6a50]",
  warning: "border-[#e5d1b8] bg-[#fbf4e8] text-[#8a5a25]",
  danger: "border-[#e5c1c1] bg-[#fff1f1] text-[#974343]",
  info: "border-[#bed1df] bg-[#eef5f9] text-[#3f687f]",
};

export function StatusBadge({
  children,
  tone = "neutral",
  className,
}: {
  children: string;
  tone?: StatusTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex min-h-6 max-w-full items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold leading-5",
        tones[tone],
        className,
      )}
    >
      <span className="size-1.5 shrink-0 rounded-full bg-current opacity-70" />
      <span className="truncate">{children}</span>
    </span>
  );
}
