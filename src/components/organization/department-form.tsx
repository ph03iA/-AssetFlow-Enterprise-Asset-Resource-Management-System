"use client";

import { FloppyDisk, Plus } from "@phosphor-icons/react";
import { useActionState } from "react";

import {
  createDepartmentAction,
  updateDepartmentAction,
} from "@/app/(app)/organization/actions";
import { FormFeedback } from "@/components/auth/form-feedback";
import { Button } from "@/components/ui/button";
import { InputField, SelectField, TextareaField } from "@/components/ui/field";
import { initialActionState } from "@/server/action-state";

type DepartmentOption = { id: string; name: string; isActive: boolean };
type HeadOption = { id: string; name: string; email: string };
type DepartmentValue = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  parentId: string | null;
  headId: string | null;
  isActive: boolean;
};

export function DepartmentForm({
  departments,
  heads,
  initial,
}: {
  departments: DepartmentOption[];
  heads: HeadOption[];
  initial?: DepartmentValue;
}) {
  const action = initial ? updateDepartmentAction : createDepartmentAction;
  const [state, formAction, pending] = useActionState(action, initialActionState);
  const formId = initial?.id ?? "new-department";

  return (
    <form action={formAction} className="grid gap-5" noValidate>
      <FormFeedback message={state.message} success={state.success} />
      {initial ? <input type="hidden" name="departmentId" value={initial.id} /> : null}
      <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_140px]">
        <InputField
          label="Department name"
          name="name"
          id={`${formId}-name`}
          placeholder="e.g. Engineering"
          defaultValue={initial?.name}
          error={state.fieldErrors?.name?.[0]}
          required
        />
        <InputField
          label="Code"
          name="code"
          id={`${formId}-code`}
          placeholder="ENG"
          defaultValue={initial?.code}
          error={state.fieldErrors?.code?.[0]}
          required
        />
      </div>
      <TextareaField
        label="Description"
        name="description"
        id={`${formId}-description`}
        placeholder="What this department is responsible for"
        defaultValue={initial?.description ?? ""}
        error={state.fieldErrors?.description?.[0]}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField
          label="Parent department"
          name="parentId"
          id={`${formId}-parent`}
          defaultValue={initial?.parentId ?? ""}
          hint="Optional hierarchy parent. Cycles are rejected."
        >
          <option value="">No parent</option>
          {departments
            .filter((department) => department.id !== initial?.id && department.isActive)
            .map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
        </SelectField>
        <SelectField
          label="Department Head"
          name="headId"
          id={`${formId}-head`}
          defaultValue={initial?.headId ?? ""}
          hint="Only Employees already promoted to Department Head appear."
        >
          <option value="">Not assigned</option>
          {heads.map((head) => (
            <option key={head.id} value={head.id}>
              {head.name}
            </option>
          ))}
        </SelectField>
      </div>
      <label className="flex min-h-11 items-center gap-3 rounded-xl border border-[#d6ded8] bg-[#f8faf8] px-3.5 text-sm font-semibold text-[#3a4940]">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={initial?.isActive ?? true}
          className="size-4 accent-[#39755b]"
        />
        Active and available for new assignments
      </label>
      <Button type="submit" className="justify-self-start" disabled={pending}>
        {initial ? (
          <FloppyDisk className="size-4" weight="bold" aria-hidden="true" />
        ) : (
          <Plus className="size-4" weight="bold" aria-hidden="true" />
        )}
        {pending
          ? "Saving department..."
          : initial
            ? "Save department"
            : "Create department"}
      </Button>
    </form>
  );
}
