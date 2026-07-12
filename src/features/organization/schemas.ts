import { z } from "zod";

import { Role, UserStatus } from "../../generated/prisma/enums";

const optionalId = z
  .string()
  .trim()
  .transform((value) => (value === "" ? null : value))
  .nullable();

export const departmentInputSchema = z.object({
  name: z.string().trim().min(2).max(80),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(2)
    .max(12)
    .regex(/^[A-Z0-9-]+$/, "Use uppercase letters, numbers, or hyphens."),
  description: z.string().trim().max(300).optional().default(""),
  parentId: optionalId,
  headId: optionalId,
  isActive: z.boolean().default(true),
});

export const categoryFieldDefinitionSchema = z.object({
  key: z
    .string()
    .trim()
    .min(1)
    .max(40)
    .regex(/^[a-z][a-zA-Z0-9]*$/, "Use a camelCase key."),
  label: z.string().trim().min(2).max(80),
  type: z.enum(["text", "number", "date", "boolean"]),
  required: z.boolean().default(false),
});

export const categoryInputSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(300).optional().default(""),
  isActive: z.boolean().default(true),
  fieldDefinitions: z
    .array(categoryFieldDefinitionSchema)
    .max(12)
    .superRefine((fields, context) => {
      const keys = new Set<string>();
      fields.forEach((field, index) => {
        if (keys.has(field.key)) {
          context.addIssue({
            code: "custom",
            path: [index, "key"],
            message: "Custom field keys must be unique.",
          });
        }
        keys.add(field.key);
      });
    }),
});

export const employeeUpdateSchema = z.object({
  departmentId: optionalId,
  role: z.enum([Role.EMPLOYEE, Role.ASSET_MANAGER, Role.DEPARTMENT_HEAD]),
  status: z.enum([UserStatus.ACTIVE, UserStatus.INACTIVE]),
});

export type DepartmentInput = z.infer<typeof departmentInputSchema>;
export type CategoryInput = z.infer<typeof categoryInputSchema>;
export type EmployeeUpdateInput = z.infer<typeof employeeUpdateSchema>;

export function wouldCreateHierarchyCycle(
  departmentId: string,
  parentId: string | null,
  parentsById: ReadonlyMap<string, string | null>,
) {
  let currentId = parentId;
  const visited = new Set<string>();

  while (currentId) {
    if (currentId === departmentId || visited.has(currentId)) {
      return true;
    }

    visited.add(currentId);
    currentId = parentsById.get(currentId) ?? null;
  }

  return false;
}
