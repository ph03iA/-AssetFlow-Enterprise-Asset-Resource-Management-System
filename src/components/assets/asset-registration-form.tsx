"use client";

import { ArrowRight, Package } from "@phosphor-icons/react";
import { useActionState, useMemo, useState } from "react";

import { registerAssetAction } from "@/app/(app)/assets/actions";
import { FormFeedback } from "@/components/auth/form-feedback";
import { Button } from "@/components/ui/button";
import { InputField, SelectField, TextareaField } from "@/components/ui/field";
import type { CategoryField } from "@/features/organization/schemas";
import { AssetCondition } from "@/generated/prisma/enums";
import { humanizeEnum } from "@/lib/format";
import { initialActionState } from "@/server/action-state";

type CategoryOption = {
  id: string;
  name: string;
  description: string | null;
  fields: CategoryField[];
};

export function AssetRegistrationForm({
  categories,
  departments,
}: {
  categories: CategoryOption[];
  departments: Array<{ id: string; name: string }>;
}) {
  const [state, formAction, pending] = useActionState(
    registerAssetAction,
    initialActionState,
  );
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [customValues, setCustomValues] = useState<
    Record<string, string | boolean>
  >({});
  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === categoryId),
    [categories, categoryId],
  );

  return (
    <form action={formAction} className="grid gap-7" noValidate>
      <FormFeedback message={state.message} success={state.success} />
      <input type="hidden" name="customValues" value={JSON.stringify(customValues)} />

      <section className="grid gap-5 rounded-2xl border border-[#d9e0da] bg-white p-5 sm:p-6">
        <div className="border-b border-[#e5eae6] pb-4">
          <h2 className="font-bold tracking-tight">Identity and classification</h2>
          <p className="mt-1 text-xs leading-5 text-[#718078]">
            The unique AssetFlow tag and QR value are generated after save.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <InputField
            label="Asset name"
            name="name"
            placeholder="ThinkPad X1 Carbon"
            error={state.fieldErrors?.name?.[0]}
            required
          />
          <SelectField
            label="Category"
            name="categoryId"
            value={categoryId}
            onChange={(event) => {
              setCategoryId(event.target.value);
              setCustomValues({});
            }}
            error={state.fieldErrors?.categoryId?.[0]}
            required
          >
            {categories.length === 0 ? (
              <option value="">Create an active category first</option>
            ) : null}
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </SelectField>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <InputField
            label="Serial number"
            name="serialNumber"
            placeholder="Manufacturer serial number"
            error={state.fieldErrors?.serialNumber?.[0]}
          />
          <SelectField label="Department" name="departmentId" defaultValue="">
            <option value="">Organization pool</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </SelectField>
        </div>
        <TextareaField
          label="Description"
          name="description"
          placeholder="Model, purpose, specifications, or distinguishing details"
          error={state.fieldErrors?.description?.[0]}
        />
      </section>

      <section className="grid gap-5 rounded-2xl border border-[#d9e0da] bg-white p-5 sm:p-6">
        <div className="border-b border-[#e5eae6] pb-4">
          <h2 className="font-bold tracking-tight">Condition and location</h2>
          <p className="mt-1 text-xs leading-5 text-[#718078]">
            Initial registration always enters the lifecycle as Available.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <SelectField label="Condition" name="condition" defaultValue={AssetCondition.GOOD}>
            {Object.values(AssetCondition).map((condition) => (
              <option key={condition} value={condition}>
                {humanizeEnum(condition)}
              </option>
            ))}
          </SelectField>
          <InputField
            label="Location"
            name="location"
            placeholder="Bengaluru - Engineering Floor"
            error={state.fieldErrors?.location?.[0]}
            required
          />
        </div>
        <label className="flex min-h-12 items-start gap-3 rounded-xl border border-[#d6ded8] bg-[#f8faf8] px-3.5 py-3 text-sm font-semibold text-[#3a4940]">
          <input type="checkbox" name="isBookable" className="mt-0.5 size-4 accent-[#39755b]" />
          <span>
            Shared / bookable resource
            <span className="mt-0.5 block text-xs font-normal leading-5 text-[#718078]">
              Makes this asset available in Resource Booking after registration.
            </span>
          </span>
        </label>
      </section>

      <section className="grid gap-5 rounded-2xl border border-[#d9e0da] bg-white p-5 sm:p-6">
        <div className="border-b border-[#e5eae6] pb-4">
          <h2 className="font-bold tracking-tight">Acquisition and planning</h2>
          <p className="mt-1 text-xs leading-5 text-[#718078]">
            Cost supports ranking and reports only; it is not connected to accounting.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <InputField label="Acquisition date" name="acquisitionDate" type="date" />
          <InputField
            label="Acquisition cost"
            name="acquisitionCost"
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            error={state.fieldErrors?.acquisitionCost?.[0]}
          />
          <InputField label="Next maintenance" name="nextMaintenanceAt" type="date" />
          <InputField
            label="Planned retirement"
            name="retirementDate"
            type="date"
            error={state.fieldErrors?.retirementDate?.[0]}
          />
        </div>
      </section>

      {selectedCategory?.fields.length ? (
        <section className="grid gap-5 rounded-2xl border border-[#cad8ce] bg-[#f8fbf9] p-5 sm:p-6">
          <div className="border-b border-[#dce6df] pb-4">
            <h2 className="font-bold tracking-tight">{selectedCategory.name} details</h2>
            <p className="mt-1 text-xs leading-5 text-[#718078]">
              Category-specific information configured by your Administrator.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            {selectedCategory.fields.map((field) => {
              if (field.type === "boolean") {
                return (
                  <SelectField
                    key={field.key}
                    label={field.label}
                    name={`custom-${field.key}`}
                    value={String(customValues[field.key] ?? "")}
                    onChange={(event) =>
                      setCustomValues((current) => ({
                        ...current,
                        [field.key]: event.target.value,
                      }))
                    }
                    required={field.required}
                  >
                    <option value="">Choose</option>
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </SelectField>
                );
              }

              return (
                <InputField
                  key={field.key}
                  label={field.label}
                  name={`custom-${field.key}`}
                  type={field.type}
                  value={String(customValues[field.key] ?? "")}
                  onChange={(event) =>
                    setCustomValues((current) => ({
                      ...current,
                      [field.key]: event.target.value,
                    }))
                  }
                  required={field.required}
                />
              );
            })}
          </div>
        </section>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#cad8ce] bg-[#e8f0eb] p-4 sm:p-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-[#39755b]">
            <Package className="size-[18px]" weight="duotone" aria-hidden="true" />
          </span>
          <p className="text-xs leading-5 text-[#526158]">
            Asset history starts immediately and records every later allocation,
            maintenance event, and audit result.
          </p>
        </div>
        <Button type="submit" disabled={pending || categories.length === 0}>
          {pending ? "Generating asset record..." : "Register asset"}
          <ArrowRight className="size-4" weight="bold" aria-hidden="true" />
        </Button>
      </div>
    </form>
  );
}
