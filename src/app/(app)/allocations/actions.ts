"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  allocationInputSchema,
  decisionInputSchema,
  returnRequestInputSchema,
  transferInputSchema,
} from "@/features/allocations/schemas";
import {
  allocateAsset,
  decideReturn,
  decideTransfer,
  requestReturn,
  requestTransfer,
} from "@/features/allocations/service";
import { actionFailure, type ActionState } from "@/server/action-state";
import { requireUser } from "@/server/auth/session";

function splitTarget(value: FormDataEntryValue | null) {
  const [type, id] = String(value ?? "").split(":");
  return {
    userId: type === "user" && id ? id : null,
    departmentId: type === "department" && id ? id : null,
  };
}

function validationFailure(error: {
  flatten(): { fieldErrors: ActionState["fieldErrors"] };
}): ActionState {
  return {
    success: false,
    message: "Review the highlighted fields and try again.",
    fieldErrors: error.flatten().fieldErrors,
  };
}

function revalidateCustody() {
  revalidatePath("/allocations");
  revalidatePath("/assets");
  revalidatePath("/dashboard");
  revalidatePath("/notifications");
}

export async function allocateAssetAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireUser();
  const target = splitTarget(formData.get("assignee"));
  const parsed = allocationInputSchema.safeParse({
    assetId: formData.get("assetId"),
    assigneeUserId: target.userId,
    assigneeDepartmentId: target.departmentId,
    expectedReturnAt: formData.get("expectedReturnAt") ?? "",
    checkoutNotes: formData.get("checkoutNotes") ?? "",
  });

  if (!parsed.success) return validationFailure(parsed.error);

  try {
    await allocateAsset(actor, parsed.data);
    revalidateCustody();
  } catch (error) {
    return actionFailure(error);
  }

  redirect("/allocations?created=1");
}

export async function requestTransferAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireUser();
  const target = splitTarget(formData.get("target"));
  const parsed = transferInputSchema.safeParse({
    allocationId: formData.get("allocationId"),
    targetUserId: target.userId,
    targetDepartmentId: target.departmentId,
    reason: formData.get("reason"),
  });

  if (!parsed.success) return validationFailure(parsed.error);

  try {
    await requestTransfer(actor, parsed.data);
    revalidateCustody();
    return { success: true, message: "Transfer request submitted for approval." };
  } catch (error) {
    return actionFailure(error);
  }
}

export async function decideTransferAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireUser();
  const parsed = decisionInputSchema.safeParse({
    requestId: formData.get("requestId"),
    approved: formData.get("decision") === "approve",
    decisionNotes: formData.get("decisionNotes") ?? "",
  });

  if (!parsed.success) return validationFailure(parsed.error);

  try {
    await decideTransfer(actor, parsed.data);
    revalidateCustody();
    return {
      success: true,
      message: parsed.data.approved ? "Transfer approved." : "Transfer rejected.",
    };
  } catch (error) {
    return actionFailure(error);
  }
}

export async function requestReturnAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireUser();
  const parsed = returnRequestInputSchema.safeParse({
    allocationId: formData.get("allocationId"),
    condition: formData.get("condition"),
    checkInNotes: formData.get("checkInNotes"),
  });

  if (!parsed.success) return validationFailure(parsed.error);

  try {
    await requestReturn(actor, parsed.data);
    revalidateCustody();
    return { success: true, message: "Return submitted for condition approval." };
  } catch (error) {
    return actionFailure(error);
  }
}

export async function decideReturnAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireUser();
  const parsed = decisionInputSchema.safeParse({
    requestId: formData.get("requestId"),
    approved: formData.get("decision") === "approve",
    decisionNotes: formData.get("decisionNotes") ?? "",
  });

  if (!parsed.success) return validationFailure(parsed.error);

  try {
    await decideReturn(actor, parsed.data);
    revalidateCustody();
    return {
      success: true,
      message: parsed.data.approved ? "Return approved." : "Return rejected.",
    };
  } catch (error) {
    return actionFailure(error);
  }
}
