import { CheckCircle, WarningCircle } from "@phosphor-icons/react/dist/ssr";

export function FormFeedback({
  message,
  success = false,
}: {
  message?: string;
  success?: boolean;
}) {
  if (!message) {
    return null;
  }

  return (
    <div
      role={success ? "status" : "alert"}
      className={
        success
          ? "flex gap-3 rounded-xl border border-[#bdd6c7] bg-[#edf7f1] p-3.5 text-sm leading-5 text-[#2f6a50]"
          : "flex gap-3 rounded-xl border border-[#e5c1c1] bg-[#fff1f1] p-3.5 text-sm leading-5 text-[#8e3f3f]"
      }
    >
      {success ? (
        <CheckCircle className="mt-0.5 size-4 shrink-0" weight="fill" />
      ) : (
        <WarningCircle className="mt-0.5 size-4 shrink-0" weight="fill" />
      )}
      <span>{message}</span>
    </div>
  );
}
