"use client";

import { CalendarDots } from "@phosphor-icons/react";
import { useActionState } from "react";

import { rescheduleBookingAction } from "@/app/(app)/bookings/actions";
import { FormFeedback } from "@/components/auth/form-feedback";
import { Button } from "@/components/ui/button";
import { InputField } from "@/components/ui/field";
import { initialActionState } from "@/server/action-state";

export function RescheduleBookingForm({
  bookingId,
  startAt,
  endAt,
}: {
  bookingId: string;
  startAt: string;
  endAt: string;
}) {
  const [state, formAction, pending] = useActionState(
    rescheduleBookingAction,
    initialActionState,
  );

  return (
    <form action={formAction} className="grid gap-4" noValidate>
      <FormFeedback message={state.message} success={state.success} />
      <input type="hidden" name="bookingId" value={bookingId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <InputField
          label="New start"
          name="startAt"
          type="datetime-local"
          defaultValue={startAt}
          error={state.fieldErrors?.startAt?.[0]}
          required
        />
        <InputField
          label="New end"
          name="endAt"
          type="datetime-local"
          defaultValue={endAt}
          error={state.fieldErrors?.endAt?.[0]}
          required
        />
      </div>
      <Button type="submit" size="sm" disabled={pending} className="justify-self-start">
        <CalendarDots className="size-4" weight="bold" aria-hidden="true" />
        {pending ? "Checking..." : "Reschedule"}
      </Button>
    </form>
  );
}
