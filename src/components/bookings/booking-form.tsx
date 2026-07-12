"use client";

import { ArrowRight, CalendarCheck, Warning } from "@phosphor-icons/react";
import { useActionState } from "react";

import { createBookingAction } from "@/app/(app)/bookings/actions";
import { FormFeedback } from "@/components/auth/form-feedback";
import { Button } from "@/components/ui/button";
import { InputField, SelectField, TextareaField } from "@/components/ui/field";
import { initialActionState } from "@/server/action-state";

type ResourceOption = {
  id: string;
  assetTag: string;
  name: string;
  location: string;
  category: { name: string };
};

type PreferredResource = {
  id: string;
  assetTag: string;
  name: string;
  location: string;
  status: string;
  isBookable: boolean;
} | null;

export function BookingForm({
  resources,
  departments,
  preferredAsset,
  timezone,
}: {
  resources: ResourceOption[];
  departments: Array<{ id: string; name: string }>;
  preferredAsset: PreferredResource;
  timezone: string;
}) {
  const [state, formAction, pending] = useActionState(
    createBookingAction,
    initialActionState,
  );
  const preferredAvailable = Boolean(
    preferredAsset && resources.some((resource) => resource.id === preferredAsset.id),
  );

  return (
    <form action={formAction} className="grid gap-6" noValidate>
      <FormFeedback message={state.message} success={state.success} />

      {preferredAsset && !preferredAvailable ? (
        <div className="rounded-2xl border border-[#e3c6ba] bg-[#fff8f3] p-4">
          <div className="flex gap-3">
            <Warning className="mt-0.5 size-5 shrink-0 text-[#a2672a]" weight="fill" />
            <div>
              <p className="text-sm font-bold text-[#543c29]">
                {preferredAsset.assetTag} cannot be booked right now.
              </p>
              <p className="mt-1 text-xs leading-5 text-[#80674f]">
                It is either not a shared resource or its current status is {preferredAsset.status.toLowerCase().replaceAll("_", " ")}.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <section className="grid gap-5 rounded-2xl border border-[#d9e0da] bg-white p-5 sm:p-6">
        <div className="flex items-start gap-3 border-b border-[#e5eae6] pb-4">
          <span className="grid size-9 place-items-center rounded-xl bg-[#e8f0eb] text-[#39755b]">
            <CalendarCheck className="size-[18px]" weight="duotone" aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-bold tracking-tight">Resource and purpose</h2>
            <p className="mt-1 text-xs text-[#718078]">
              Every confirmed booking appears on the shared calendar.
            </p>
          </div>
        </div>
        <SelectField
          label="Shared resource"
          name="assetId"
          defaultValue={preferredAvailable ? preferredAsset?.id : ""}
          error={state.fieldErrors?.assetId?.[0]}
          required
        >
          <option value="">Choose a resource</option>
          {resources.map((resource) => (
            <option key={resource.id} value={resource.id}>
              {resource.assetTag} - {resource.name} / {resource.location}
            </option>
          ))}
        </SelectField>
        {departments.length ? (
          <SelectField
            label="Booking owner"
            name="onBehalfOfDepartmentId"
            defaultValue=""
            hint="Department Heads may reserve a resource for their department."
            error={state.fieldErrors?.onBehalfOfDepartmentId?.[0]}
          >
            <option value="">My booking</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name} Department
              </option>
            ))}
          </SelectField>
        ) : (
          <input type="hidden" name="onBehalfOfDepartmentId" value="" />
        )}
        <TextareaField
          label="Purpose"
          name="purpose"
          placeholder="Meeting, field visit, workshop, or operational use"
          error={state.fieldErrors?.purpose?.[0]}
          required
        />
      </section>

      <section className="grid gap-5 rounded-2xl border border-[#d9e0da] bg-white p-5 sm:p-6">
        <div className="border-b border-[#e5eae6] pb-4">
          <h2 className="font-bold tracking-tight">Schedule</h2>
          <p className="mt-1 text-xs text-[#718078]">
            Times use {timezone.replaceAll("_", " ")}. Adjacent slots are allowed; overlapping times are blocked.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <InputField
            label="Starts"
            name="startAt"
            type="datetime-local"
            error={state.fieldErrors?.startAt?.[0]}
            required
          />
          <InputField
            label="Ends"
            name="endAt"
            type="datetime-local"
            error={state.fieldErrors?.endAt?.[0]}
            required
          />
        </div>
      </section>

      <Button
        type="submit"
        className="justify-self-end"
        disabled={pending || resources.length === 0}
      >
        {pending ? "Checking the calendar..." : "Confirm booking"}
        <ArrowRight className="size-4" weight="bold" aria-hidden="true" />
      </Button>
    </form>
  );
}
