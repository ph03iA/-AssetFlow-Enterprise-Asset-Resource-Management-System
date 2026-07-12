"use client";

import { FloppyDisk } from "@phosphor-icons/react";
import { useActionState } from "react";

import { updateEmployeeAction } from "@/app/(app)/organization/actions";
import { FormFeedback } from "@/components/auth/form-feedback";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/field";
import { Role, UserStatus } from "@/generated/prisma/enums";
import { initialActionState } from "@/server/action-state";

export function EmployeeAccessForm({
  employee,
  departments,
}: {
  employee: {
    id: string;
    departmentId: string | null;
    role: Role;
    status: UserStatus;
  };
  departments: Array<{ id: string; name: string; isActive: boolean }>;
}) {
  const [state, formAction, pending] = useActionState(
    updateEmployeeAction,
    initialActionState,
  );
  const formId = `employee-${employee.id}`;

  return (
    <form action={formAction} className="grid gap-5" noValidate>
      <FormFeedback message={state.message} success={state.success} />
      <input type="hidden" name="employeeId" value={employee.id} />
      <div className="grid gap-5 sm:grid-cols-3">
        <SelectField
          label="Department"
          name="departmentId"
          id={`${formId}-department`}
          defaultValue={employee.departmentId ?? ""}
        >
          <option value="">Not assigned</option>
          {departments
            .filter((department) => department.isActive)
            .map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
        </SelectField>
        <SelectField
          label="Role"
          name="role"
          id={`${formId}-role`}
          defaultValue={employee.role}
        >
          <option value={Role.EMPLOYEE}>Employee</option>
          <option value={Role.ASSET_MANAGER}>Asset Manager</option>
          <option value={Role.DEPARTMENT_HEAD}>Department Head</option>
        </SelectField>
        <SelectField
          label="Status"
          name="status"
          id={`${formId}-status`}
          defaultValue={employee.status}
        >
          <option value={UserStatus.ACTIVE}>Active</option>
          <option value={UserStatus.INACTIVE}>Inactive</option>
        </SelectField>
      </div>
      <Button type="submit" className="justify-self-start" disabled={pending}>
        <FloppyDisk className="size-4" weight="bold" aria-hidden="true" />
        {pending ? "Updating access..." : "Save employee access"}
      </Button>
    </form>
  );
}
