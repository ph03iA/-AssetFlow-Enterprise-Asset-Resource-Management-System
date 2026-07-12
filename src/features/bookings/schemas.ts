import { z } from "zod";

const localDateTime = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required.`)
    .transform((value) => new Date(value))
    .refine((value) => !Number.isNaN(value.getTime()), {
      message: `Enter a valid ${label.toLowerCase()}.`,
    });

const optionalId = z
  .string()
  .trim()
  .optional()
  .transform((value) => value || null);

function validateInterval(
  value: { startAt: Date; endAt: Date },
  context: z.RefinementCtx,
) {
  if (value.endAt <= value.startAt) {
    context.addIssue({
      code: "custom",
      path: ["endAt"],
      message: "End time must be after the start time.",
    });
  }
}

export const bookingInputSchema = z
  .object({
    assetId: z.string().trim().min(1, "Choose a resource."),
    onBehalfOfDepartmentId: optionalId,
    purpose: z
      .string()
      .trim()
      .min(3, "Describe what the resource is needed for.")
      .max(300, "Purpose must be 300 characters or fewer."),
    startAt: localDateTime("Start time"),
    endAt: localDateTime("End time"),
  })
  .superRefine(validateInterval);

export const bookingRescheduleSchema = z
  .object({
    bookingId: z.string().trim().min(1),
    startAt: localDateTime("Start time"),
    endAt: localDateTime("End time"),
  })
  .superRefine(validateInterval);

export const bookingCancellationSchema = z.object({
  bookingId: z.string().trim().min(1),
  reason: z
    .string()
    .trim()
    .min(3, "Add a short cancellation reason.")
    .max(300, "Reason must be 300 characters or fewer."),
});

export const bookingCalendarQuerySchema = z.object({
  week: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid calendar date.")
    .optional(),
  resourceId: optionalId,
});

export type BookingInput = z.infer<typeof bookingInputSchema>;
export type BookingRescheduleInput = z.infer<typeof bookingRescheduleSchema>;
export type BookingCancellationInput = z.infer<typeof bookingCancellationSchema>;
export type BookingCalendarQuery = z.infer<typeof bookingCalendarQuerySchema>;
