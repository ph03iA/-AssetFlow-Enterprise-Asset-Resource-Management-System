"use server";

import { revalidatePath } from "next/cache";

import {
  categoryInputSchema,
  departmentInputSchema,
  employeeUpdateSchema,
} from "@/features/organization/schemas";
import {
  createCategory,
  createDepartment,
  updateCategory,
  updateDepartment,
  updateEmployee,
} from "@/features/organization/service";
import { actionFailure, type ActionState } from "@/server/action-state";
import { requirePermission } from "@/server/auth/session";

function fieldErrors(error: { flatten(): { fieldErrors: ActionState["fieldErrors"] } }) {
  return {
    success: false,
    message: "Review the highlighted fields and try again.",
    fieldErrors: error.flatten().fieldErrors,
  } satisfies ActionState;
}

function departmentValues(formData: FormData) {
  return {
    name: formData.get("name"),
    code: formData.get("code"),
    description: formData.get("description") ?? "",
    parentId: formData.get("parentId") ?? "",
    headId: formData.get("headId") ?? "",
    isActive: formData.get("isActive") === "on",
  };
}

function categoryValues(formData: FormData) {
  let definitions: unknown = [];
  try {
    definitions = JSON.parse(String(formData.get("fieldDefinitions") ?? "[]"));
  } catch {
    definitions = null;
  }

  return {
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    isActive: formData.get("isActive") === "on",
    fieldDefinitions: definitions,
  };
}

export async function createDepartmentAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requirePermission("organization.manage");
  const parsed = departmentInputSchema.safeParse(departmentValues(formData));

  if (!parsed.success) return fieldErrors(parsed.error);

  try {
    await createDepartment(actor, parsed.data);
    revalidatePath("/organization");
    return { success: true, message: "Department created." };
  } catch (error) {
    return actionFailure(error);
  }
}

export async function updateDepartmentAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requirePermission("organization.manage");
  const departmentId = String(formData.get("departmentId") ?? "");
  const parsed = departmentInputSchema.safeParse(departmentValues(formData));

  if (!departmentId) return { message: "Department is missing." };
  if (!parsed.success) return fieldErrors(parsed.error);

  try {
    await updateDepartment(actor, departmentId, parsed.data);
    revalidatePath("/organization");
    return { success: true, message: "Department updated." };
  } catch (error) {
    return actionFailure(error);
  }
}

export async function createCategoryAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requirePermission("organization.manage");
  const parsed = categoryInputSchema.safeParse(categoryValues(formData));

  if (!parsed.success) return fieldErrors(parsed.error);

  try {
    await createCategory(actor, parsed.data);
    revalidatePath("/organization");
    return { success: true, message: "Asset category created." };
  } catch (error) {
    return actionFailure(error);
  }
}

export async function updateCategoryAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requirePermission("organization.manage");
  const categoryId = String(formData.get("categoryId") ?? "");
  const parsed = categoryInputSchema.safeParse(categoryValues(formData));

  if (!categoryId) return { message: "Asset category is missing." };
  if (!parsed.success) return fieldErrors(parsed.error);

  try {
    await updateCategory(actor, categoryId, parsed.data);
    revalidatePath("/organization");
    return { success: true, message: "Asset category updated." };
  } catch (error) {
    return actionFailure(error);
  }
}

export async function updateEmployeeAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requirePermission("organization.manage");
  const employeeId = String(formData.get("employeeId") ?? "");
  const parsed = employeeUpdateSchema.safeParse({
    departmentId: formData.get("departmentId") ?? "",
    role: formData.get("role"),
    status: formData.get("status"),
  });

  if (!employeeId) return { message: "Employee is missing." };
  if (!parsed.success) return fieldErrors(parsed.error);

  try {
    await updateEmployee(actor, employeeId, parsed.data);
    revalidatePath("/organization");
    return { success: true, message: "Employee access updated." };
  } catch (error) {
    return actionFailure(error);
  }
}
