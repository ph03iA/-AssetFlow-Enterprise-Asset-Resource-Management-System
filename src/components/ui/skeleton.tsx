import { cn } from "@/lib/cn";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "animate-pulse rounded-lg bg-[#dfe5e0] motion-reduce:animate-none",
        className,
      )}
    />
  );
}
