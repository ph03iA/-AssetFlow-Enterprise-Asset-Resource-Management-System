"use client";

import { XCircle } from "@phosphor-icons/react";
import { useActionState } from "react";

import { cancelBookingAction } from "@/app/(app)/bookings/actions";
import { FormFeedback } from "@/components/auth/form-feedback";
import { Button } from "@/components/ui/button";
import { TextareaField } from "@/components/ui/field";
import { initialActionState } from "@/server/action-state";

export function CancelBookingForm({ bookingId }: { bookingId: string }) {
  const [state, formAction, pending] = useActionState(
    cancelBookingAction,
    initialActionState,
  );

  return (
    <form action={formAction} className="grid gap-4" noValidate>
      <FormFeedback message={state.message} success={state.success} />
      <input type="hidden" name="bookingId" value={bookingId} />
      <TextareaField
        label="Cancellation reason"
        name="reason"
        placeholder="Why is this slot no longer needed?"
        error={state.fieldErrors?.reason?.[0]}
        required
      />
      <Button type="submit" size="sm" variant="danger" disabled={pending} className="justify-self-start">
        <XCircle className="size-4" weight="bold" aria-hidden="true" />
        {pending ? "Cancelling..." : "Cancel booking"}
      </Button>
    </form>
  );
}
