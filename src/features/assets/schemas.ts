import { z } from "zod";

import { AssetCondition, AssetStatus } from "../../generated/prisma/enums";
import type { CategoryField } from "../organization/schemas";

const optionalId = z
  .string()
  .trim()
  .transform((value) => (value === "" ? null : value));

const optionalDate = z
  .string()
  .trim()
  .transform((value) => (value ? new Date(`${value}T00:00:00`) : null))
  .refine((value) => value === null || !Number.isNaN(value.getTime()), {
    message: "Enter a valid date.",
  });

const optionalCost = z
  .string()
  .trim()
  .transform((value) => (value === "" ? null : Number(value)))
  .refine((value) => value === null || Number.isFinite(value), {
    message: "Enter a valid acquisition cost.",
  })
  .refine((value) => value === null || value >= 0, {
    message: "Acquisition cost cannot be negative.",
  });

export const assetInputSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    categoryId: z.string().trim().min(1, "Choose an asset category."),
    departmentId: optionalId,
    serialNumber: z
      .string()
      .trim()
      .max(100)
      .transform((value) => (value === "" ? null : value)),
    description: z.string().trim().max(1000).optional().default(""),
    acquisitionDate: optionalDate,
    acquisitionCost: optionalCost,
    condition: z.enum(AssetCondition),
    location: z.string().trim().min(2).max(160),
    isBookable: z.boolean().default(false),
    customValues: z.record(
      z.string(),
      z.union([z.string(), z.number(), z.boolean(), z.null()]),
    ),
    nextMaintenanceAt: optionalDate,
    retirementDate: optionalDate,
  })
  .refine(
    (value) =>
      !value.acquisitionDate ||
      !value.retirementDate ||
      value.retirementDate > value.acquisitionDate,
    { path: ["retirementDate"], message: "Retirement must follow acquisition." },
  );

export const assetSearchSchema = z.object({
  query: z.string().trim().max(100).optional().default(""),
  categoryId: optionalId.optional().default(null),
  departmentId: optionalId.optional().default(null),
  status: z.enum(AssetStatus).nullable().optional().default(null),
  location: z.string().trim().max(160).optional().default(""),
});

export type AssetInput = z.infer<typeof assetInputSchema>;
export type AssetSearch = z.infer<typeof assetSearchSchema>;

export function validateCategoryValues(
  definitions: readonly CategoryField[],
  values: Record<string, string | number | boolean | null>,
) {
  const errors: Record<string, string> = {};

  for (const definition of definitions) {
    const value = values[definition.key];
    const empty = value === undefined || value === null || value === "";

    if (definition.required && empty) {
      errors[definition.key] = `${definition.label} is required.`;
      continue;
    }
    if (empty) continue;

    if (
      definition.type === "number" &&
      (typeof value === "boolean" || !Number.isFinite(Number(value)))
    ) {
      errors[definition.key] = `${definition.label} must be a number.`;
    }
    if (
      definition.type === "boolean" &&
      typeof value !== "boolean" &&
      value !== "true" &&
      value !== "false"
    ) {
      errors[definition.key] = `${definition.label} must be yes or no.`;
    }
    if (
      definition.type === "date" &&
      Number.isNaN(new Date(String(value)).getTime())
    ) {
      errors[definition.key] = `${definition.label} must be a valid date.`;
    }
  }

  return errors;
}
