import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

import { cn } from "@/lib/cn";

type FieldShellProps = {
  label: string;
  name: string;
  hint?: string;
  error?: string;
  children: ReactNode;
};

function FieldShell({
  label,
  name,
  hint,
  error,
  children,
}: FieldShellProps) {
  const descriptionId = hint || error ? `${name}-description` : undefined;

  return (
    <div className="grid min-w-0 gap-2">
      <label htmlFor={name} className="text-sm font-semibold text-[#26332c]">
        {label}
      </label>
      {children}
      {hint || error ? (
        <p
          id={descriptionId}
          className={cn(
            "text-xs leading-5",
            error ? "text-[#a34343]" : "text-[#6a786f]",
          )}
        >
          {error ?? hint}
        </p>
      ) : null}
    </div>
  );
}

const controlClassName =
  "min-h-11 w-full min-w-0 rounded-xl border border-[#ccd5ce] bg-white px-3.5 text-sm text-[#17211d] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] transition-[border-color,box-shadow] placeholder:text-[#8b978f] hover:border-[#aebbb1] focus:border-[#39755b] focus:outline-none focus:ring-4 focus:ring-[#39755b]/10 disabled:bg-[#edf1ed] disabled:text-[#77847c]";

type InputFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "name"> &
  Omit<FieldShellProps, "children">;

export function InputField({
  label,
  name,
  hint,
  error,
  className,
  ...props
}: InputFieldProps) {
  return (
    <FieldShell label={label} name={name} hint={hint} error={error}>
      <input
        id={name}
        name={name}
        aria-invalid={Boolean(error)}
        aria-describedby={hint || error ? `${name}-description` : undefined}
        className={cn(controlClassName, className)}
        {...props}
      />
    </FieldShell>
  );
}

type SelectFieldProps = Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  "name"
> &
  Omit<FieldShellProps, "children">;

export function SelectField({
  label,
  name,
  hint,
  error,
  className,
  children,
  ...props
}: SelectFieldProps) {
  return (
    <FieldShell label={label} name={name} hint={hint} error={error}>
      <select
        id={name}
        name={name}
        aria-invalid={Boolean(error)}
        aria-describedby={hint || error ? `${name}-description` : undefined}
        className={cn(controlClassName, className)}
        {...props}
      >
        {children}
      </select>
    </FieldShell>
  );
}

type TextareaFieldProps = Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  "name"
> &
  Omit<FieldShellProps, "children">;

export function TextareaField({
  label,
  name,
  hint,
  error,
  className,
  ...props
}: TextareaFieldProps) {
  return (
    <FieldShell label={label} name={name} hint={hint} error={error}>
      <textarea
        id={name}
        name={name}
        aria-invalid={Boolean(error)}
        aria-describedby={hint || error ? `${name}-description` : undefined}
        className={cn(controlClassName, "min-h-28 resize-y py-3", className)}
        {...props}
      />
    </FieldShell>
  );
}
