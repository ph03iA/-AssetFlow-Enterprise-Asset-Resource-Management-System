"use client";

import { PaperPlaneTilt } from "@phosphor-icons/react";
import { useActionState } from "react";

import { requestTransferAction } from "@/app/(app)/allocations/actions";
import { FormFeedback } from "@/components/auth/form-feedback";
import { Button } from "@/components/ui/button";
import { SelectField, TextareaField } from "@/components/ui/field";
import { initialActionState } from "@/server/action-state";

export function TransferRequestForm({
  allocationId,
  employees,
  departments,
}: {
  allocationId: string;
  employees: Array<{ id: string; name: string; department: { name: string } | null }>;
  departments: Array<{ id: string; name: string }>;
}) {
  const [state, formAction, pending] = useActionState(
    requestTransferAction,
    initialActionState,
  );
  const formId = `transfer-${allocationId}`;

  return (
    <form action={formAction} className="grid gap-4" noValidate>
      <FormFeedback message={state.message} success={state.success} />
      <input type="hidden" name="allocationId" value={allocationId} />
      <SelectField
        label="New custodian"
        name="target"
        id={`${formId}-target`}
        error={state.fieldErrors?.target?.[0]}
        required
      >
        <option value="">Choose an Employee or Department</option>
        <optgroup label="Employees">
          {employees.map((employee) => (
            <option key={employee.id} value={`user:${employee.id}`}>
              {employee.name} - {employee.department?.name ?? "No department"}
            </option>
          ))}
        </optgroup>
        <optgroup label="Departments">
          {departments.map((department) => (
            <option key={department.id} value={`department:${department.id}`}>
              {department.name}
            </option>
          ))}
        </optgroup>
      </SelectField>
      <TextareaField
        label="Reason for transfer"
        name="reason"
        id={`${formId}-reason`}
        placeholder="Explain why custody should change"
        error={state.fieldErrors?.reason?.[0]}
        required
      />
      <Button type="submit" disabled={pending} className="justify-self-start">
        <PaperPlaneTilt className="size-4" weight="bold" />
        {pending ? "Submitting request..." : "Request transfer"}
      </Button>
    </form>
  );
}
