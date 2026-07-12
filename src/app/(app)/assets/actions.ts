"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { assetInputSchema } from "@/features/assets/schemas";
import { registerAsset } from "@/features/assets/service";
import { actionFailure, type ActionState } from "@/server/action-state";
import { requirePermission } from "@/server/auth/session";

function parseCustomValues(value: FormDataEntryValue | null) {
  try {
    const parsed = JSON.parse(String(value ?? "{}"));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export async function registerAssetAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requirePermission("assets.register");
  const parsed = assetInputSchema.safeParse({
    name: formData.get("name"),
    categoryId: formData.get("categoryId"),
    departmentId: formData.get("departmentId") ?? "",
    serialNumber: formData.get("serialNumber") ?? "",
    description: formData.get("description") ?? "",
    acquisitionDate: formData.get("acquisitionDate") ?? "",
    acquisitionCost: formData.get("acquisitionCost") ?? "",
    condition: formData.get("condition"),
    location: formData.get("location"),
    isBookable: formData.get("isBookable") === "on",
    customValues: parseCustomValues(formData.get("customValues")),
    nextMaintenanceAt: formData.get("nextMaintenanceAt") ?? "",
    retirementDate: formData.get("retirementDate") ?? "",
  });

  if (!parsed.success) {
    return {
      success: false,
      message: "Review the highlighted fields and try again.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  let assetId: string;
  try {
    const asset = await registerAsset(actor, parsed.data);
    assetId = asset.id;
    revalidatePath("/assets");
    revalidatePath("/dashboard");
  } catch (error) {
    return actionFailure(error);
  }

  redirect(`/assets/${assetId}`);
}
