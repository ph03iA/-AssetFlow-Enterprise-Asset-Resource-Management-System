"use client";

import { Check, X } from "@phosphor-icons/react";
import { useActionState } from "react";

import {
  decideReturnAction,
  decideTransferAction,
} from "@/app/(app)/allocations/actions";
import { FormFeedback } from "@/components/auth/form-feedback";
import { Button } from "@/components/ui/button";
import { TextareaField } from "@/components/ui/field";
import { initialActionState } from "@/server/action-state";

export function DecisionForm({
  requestId,
  type,
}: {
  requestId: string;
  type: "transfer" | "return";
}) {
  const action = type === "transfer" ? decideTransferAction : decideReturnAction;
  const [state, formAction, pending] = useActionState(action, initialActionState);

  return (
    <form action={formAction} className="grid gap-4" noValidate>
      <FormFeedback message={state.message} success={state.success} />
      <input type="hidden" name="requestId" value={requestId} />
      <TextareaField
        label="Decision notes"
        name="decisionNotes"
        id={`${type}-${requestId}-decision-notes`}
        placeholder="Optional context for the requester"
        error={state.fieldErrors?.decisionNotes?.[0]}
      />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" name="decision" value="approve" disabled={pending}>
          <Check className="size-4" weight="bold" />
          Approve
        </Button>
        <Button
          type="submit"
          name="decision"
          value="reject"
          variant="danger"
          disabled={pending}
        >
          <X className="size-4" weight="bold" />
          Reject
        </Button>
      </div>
    </form>
  );
}
