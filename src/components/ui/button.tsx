import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "quiet" | "danger";
  size?: "sm" | "md";
};

const variants = {
  primary:
    "border-transparent bg-[#39755b] text-white hover:bg-[#285642] shadow-[0_8px_24px_-14px_rgba(40,86,66,0.8)]",
  secondary:
    "border-[#cfd8d1] bg-white text-[#243029] hover:border-[#aebbb1] hover:bg-[#f7f9f7]",
  quiet:
    "border-transparent bg-transparent text-[#506057] hover:bg-[#e8ede9] hover:text-[#17211d]",
  danger:
    "border-[#e3bcbc] bg-[#fff7f7] text-[#963f3f] hover:bg-[#fbeaea]",
} as const;

export function Button({
  className,
  variant = "primary",
  size = "md",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex min-w-0 items-center justify-center gap-2 rounded-xl border font-semibold transition-[transform,background-color,border-color,color,box-shadow] duration-200 ease-out active:translate-y-px disabled:pointer-events-none disabled:opacity-50",
        size === "sm" ? "min-h-9 px-3 text-sm" : "min-h-11 px-4 text-sm",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
