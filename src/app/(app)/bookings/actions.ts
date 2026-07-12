"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  bookingCancellationSchema,
  bookingInputSchema,
  bookingRescheduleSchema,
} from "@/features/bookings/schemas";
import {
  cancelBooking,
  createBooking,
  rescheduleBooking,
} from "@/features/bookings/service";
import { actionFailure, type ActionState } from "@/server/action-state";
import { requireUser } from "@/server/auth/session";
import { normalizeLocalDateTime } from "@/lib/timezone";

function validationFailure(error: {
  flatten(): {
    fieldErrors: ActionState["fieldErrors"];
    formErrors: string[];
  };
}): ActionState {
  const flattened = error.flatten();
  return {
    success: false,
    message:
      flattened.formErrors[0] ??
      "Review the highlighted fields and try again.",
    fieldErrors: flattened.fieldErrors,
  };
}

function revalidateBookings() {
  revalidatePath("/bookings");
  revalidatePath("/dashboard");
  revalidatePath("/notifications");
  revalidatePath("/activity");
}

export async function createBookingAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireUser();
  const timeZone = actor.organization.timezone;
  const parsed = bookingInputSchema.safeParse({
    assetId: formData.get("assetId"),
    onBehalfOfDepartmentId: formData.get("onBehalfOfDepartmentId") ?? "",
    purpose: formData.get("purpose"),
    startAt: normalizeLocalDateTime(formData.get("startAt"), timeZone),
    endAt: normalizeLocalDateTime(formData.get("endAt"), timeZone),
  });
  if (!parsed.success) return validationFailure(parsed.error);

  try {
    await createBooking(actor, parsed.data);
    revalidateBookings();
  } catch (error) {
    return actionFailure(error);
  }

  redirect("/bookings?created=1");
}

export async function rescheduleBookingAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireUser();
  const timeZone = actor.organization.timezone;
  const parsed = bookingRescheduleSchema.safeParse({
    bookingId: formData.get("bookingId"),
    startAt: normalizeLocalDateTime(formData.get("startAt"), timeZone),
    endAt: normalizeLocalDateTime(formData.get("endAt"), timeZone),
  });
  if (!parsed.success) return validationFailure(parsed.error);

  try {
    await rescheduleBooking(actor, parsed.data);
    revalidateBookings();
    return { success: true, message: "Booking rescheduled." };
  } catch (error) {
    return actionFailure(error);
  }
}

export async function cancelBookingAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireUser();
  const parsed = bookingCancellationSchema.safeParse({
    bookingId: formData.get("bookingId"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) return validationFailure(parsed.error);

  try {
    await cancelBooking(actor, parsed.data);
    revalidateBookings();
    return { success: true, message: "Booking cancelled and the slot is free." };
  } catch (error) {
    return actionFailure(error);
  }
}
