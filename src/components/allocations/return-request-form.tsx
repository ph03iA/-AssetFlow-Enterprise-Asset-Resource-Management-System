"use client";

import { ArrowBendDownLeft } from "@phosphor-icons/react";
import { useActionState } from "react";

import { requestReturnAction } from "@/app/(app)/allocations/actions";
import { FormFeedback } from "@/components/auth/form-feedback";
import { Button } from "@/components/ui/button";
import { SelectField, TextareaField } from "@/components/ui/field";
import { AssetCondition } from "@/generated/prisma/enums";
import { humanizeEnum } from "@/lib/format";
import { initialActionState } from "@/server/action-state";

export function ReturnRequestForm({
  allocationId,
  currentCondition,
}: {
  allocationId: string;
  currentCondition: AssetCondition;
}) {
  const [state, formAction, pending] = useActionState(
    requestReturnAction,
    initialActionState,
  );
  const formId = `return-${allocationId}`;

  return (
    <form action={formAction} className="grid gap-4" noValidate>
      <FormFeedback message={state.message} success={state.success} />
      <input type="hidden" name="allocationId" value={allocationId} />
      <SelectField
        label="Condition at check-in"
        name="condition"
        id={`${formId}-condition`}
        defaultValue={currentCondition}
        error={state.fieldErrors?.condition?.[0]}
      >
        {Object.values(AssetCondition).map((condition) => (
          <option key={condition} value={condition}>
            {humanizeEnum(condition)}
          </option>
        ))}
      </SelectField>
      <TextareaField
        label="Check-in notes"
        name="checkInNotes"
        id={`${formId}-notes`}
        placeholder="Condition, accessories, or issues observed"
        error={state.fieldErrors?.checkInNotes?.[0]}
        required
      />
      <Button type="submit" disabled={pending} className="justify-self-start">
        <ArrowBendDownLeft className="size-4" weight="bold" />
        {pending ? "Submitting return..." : "Request return"}
      </Button>
    </form>
  );
}
