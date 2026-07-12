import type { ReactNode } from "react";

export function AuthPanel({
  eyebrow,
  title,
  description,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <section className="w-full max-w-md">
      <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-[#39755b]">
        {eyebrow}
      </p>
      <h1 className="mt-4 text-[clamp(2rem,5vw,3rem)] font-bold leading-[1.02] tracking-[-0.045em] text-[#17211d]">
        {title}
      </h1>
      <p className="mt-4 max-w-[46ch] text-sm leading-6 text-[#67756d]">
        {description}
      </p>
      <div className="mt-8">{children}</div>
      {footer ? (
        <div className="mt-8 border-t border-[#dce3dc] pt-5 text-sm text-[#66736b]">
          {footer}
        </div>
      ) : null}
    </section>
  );
}
