import { z } from "zod";

import { AssetCondition } from "../../generated/prisma/enums";

const optionalDateTime = z
  .string()
  .trim()
  .transform((value) => (value ? new Date(value) : null))
  .refine((value) => value === null || !Number.isNaN(value.getTime()), {
    message: "Enter a valid return date.",
  });

export const assigneeSchema = z
  .object({
    assigneeUserId: z.string().trim().nullable().default(null),
    assigneeDepartmentId: z.string().trim().nullable().default(null),
  })
  .refine(
    (value) => Boolean(value.assigneeUserId) !== Boolean(value.assigneeDepartmentId),
    { message: "Choose exactly one employee or department." },
  );

export const allocationInputSchema = z
  .object({
    assetId: z.string().trim().min(1),
    assigneeUserId: z.string().trim().nullable().default(null),
    assigneeDepartmentId: z.string().trim().nullable().default(null),
    expectedReturnAt: optionalDateTime,
    checkoutNotes: z.string().trim().max(500).optional().default(""),
  })
  .and(assigneeSchema);

export const transferInputSchema = z
  .object({
    allocationId: z.string().trim().min(1),
    targetUserId: z.string().trim().nullable().default(null),
    targetDepartmentId: z.string().trim().nullable().default(null),
    reason: z.string().trim().min(5).max(500),
  })
  .refine(
    (value) => Boolean(value.targetUserId) !== Boolean(value.targetDepartmentId),
    { message: "Choose exactly one transfer target." },
  );

export const returnRequestInputSchema = z.object({
  allocationId: z.string().trim().min(1),
  condition: z.enum(AssetCondition),
  checkInNotes: z.string().trim().min(3).max(500),
});

export const decisionInputSchema = z.object({
  requestId: z.string().trim().min(1),
  approved: z.boolean(),
  decisionNotes: z.string().trim().max(500).optional().default(""),
});

export type AllocationInput = z.infer<typeof allocationInputSchema>;
export type TransferInput = z.infer<typeof transferInputSchema>;
export type ReturnRequestInput = z.infer<typeof returnRequestInputSchema>;
export type DecisionInput = z.infer<typeof decisionInputSchema>;
