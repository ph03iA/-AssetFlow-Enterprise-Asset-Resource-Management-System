"use client";

import { ArrowRight, Warning } from "@phosphor-icons/react";
import Link from "next/link";
import { useActionState } from "react";

import { allocateAssetAction } from "@/app/(app)/allocations/actions";
import { FormFeedback } from "@/components/auth/form-feedback";
import { Button } from "@/components/ui/button";
import { SelectField, TextareaField, InputField } from "@/components/ui/field";
import { initialActionState } from "@/server/action-state";

type PreferredAsset = {
  id: string;
  assetTag: string;
  name: string;
  status: string;
  allocations: Array<{
    id: string;
    assigneeUser: { name: string } | null;
    assigneeDepartment: { name: string } | null;
  }>;
} | null;

export function AllocationForm({
  assets,
  employees,
  departments,
  preferredAsset,
}: {
  assets: Array<{ id: string; assetTag: string; name: string }>;
  employees: Array<{
    id: string;
    name: string;
    department: { name: string } | null;
  }>;
  departments: Array<{ id: string; name: string }>;
  preferredAsset: PreferredAsset;
}) {
  const [state, formAction, pending] = useActionState(
    allocateAssetAction,
    initialActionState,
  );
  const currentAllocation = preferredAsset?.allocations[0];
  const unavailablePreferred =
    preferredAsset && preferredAsset.status !== "AVAILABLE";

  return (
    <form action={formAction} className="grid gap-6" noValidate>
      <FormFeedback message={state.message} success={state.success} />

      {unavailablePreferred ? (
        <div className="rounded-2xl border border-[#e3c6ba] bg-[#fff8f3] p-4">
          <div className="flex gap-3">
            <Warning className="mt-0.5 size-5 shrink-0 text-[#a2672a]" weight="fill" />
            <div>
              <p className="text-sm font-bold text-[#543c29]">
                {preferredAsset.assetTag} is currently {preferredAsset.status.toLowerCase().replaceAll("_", " ")}.
              </p>
              <p className="mt-1 text-xs leading-5 text-[#80674f]">
                {currentAllocation
                  ? `It is held by ${currentAllocation.assigneeUser?.name ?? currentAllocation.assigneeDepartment?.name}. Use a transfer request instead of creating a second allocation.`
                  : "Choose an Available asset to continue."}
              </p>
              {currentAllocation ? (
                <Link
                  href={`/allocations/${currentAllocation.id}`}
                  className="mt-3 inline-flex min-h-9 items-center gap-2 rounded-lg bg-[#9a6129] px-3 text-xs font-bold text-white"
                >
                  Open transfer workflow
                  <ArrowRight className="size-3.5" weight="bold" />
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <section className="grid gap-5 rounded-2xl border border-[#d9e0da] bg-white p-5 sm:p-6">
        <div className="border-b border-[#e5eae6] pb-4">
          <h2 className="font-bold tracking-tight">Asset and custodian</h2>
          <p className="mt-1 text-xs text-[#718078]">
            The database permits only one active allocation for each asset.
          </p>
        </div>
        <SelectField
          label="Available asset"
          name="assetId"
          defaultValue={
            preferredAsset?.status === "AVAILABLE" ? preferredAsset.id : ""
          }
          error={state.fieldErrors?.assetId?.[0]}
          required
        >
          <option value="">Choose an asset</option>
          {assets.map((asset) => (
            <option key={asset.id} value={asset.id}>
              {asset.assetTag} - {asset.name}
            </option>
          ))}
        </SelectField>
        <SelectField
          label="Allocate to"
          name="assignee"
          defaultValue=""
          hint="Choose one Employee or one Department."
          error={state.fieldErrors?.assignee?.[0]}
          required
        >
          <option value="">Choose a custodian</option>
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
      </section>

      <section className="grid gap-5 rounded-2xl border border-[#d9e0da] bg-white p-5 sm:p-6">
        <div className="border-b border-[#e5eae6] pb-4">
          <h2 className="font-bold tracking-tight">Custody terms</h2>
          <p className="mt-1 text-xs text-[#718078]">
            Expected return dates feed upcoming and overdue alerts.
          </p>
        </div>
        <InputField
          label="Expected return"
          name="expectedReturnAt"
          type="datetime-local"
          error={state.fieldErrors?.expectedReturnAt?.[0]}
        />
        <TextareaField
          label="Checkout notes"
          name="checkoutNotes"
          placeholder="Purpose, included accessories, or handover notes"
          error={state.fieldErrors?.checkoutNotes?.[0]}
        />
      </section>

      <Button
        type="submit"
        className="justify-self-end"
        disabled={pending || assets.length === 0}
      >
        {pending ? "Checking availability..." : "Confirm allocation"}
        <ArrowRight className="size-4" weight="bold" aria-hidden="true" />
      </Button>
    </form>
  );
}
