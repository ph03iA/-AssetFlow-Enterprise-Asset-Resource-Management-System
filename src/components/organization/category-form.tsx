"use client";

import { FloppyDisk, Plus, Trash } from "@phosphor-icons/react";
import { useActionState, useState } from "react";

import {
  createCategoryAction,
  updateCategoryAction,
} from "@/app/(app)/organization/actions";
import { FormFeedback } from "@/components/auth/form-feedback";
import { Button } from "@/components/ui/button";
import { InputField, SelectField, TextareaField } from "@/components/ui/field";
import type { CategoryField } from "@/features/organization/schemas";
import { initialActionState } from "@/server/action-state";

type CategoryValue = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  fieldDefinitions: CategoryField[];
};

export function CategoryForm({ initial }: { initial?: CategoryValue }) {
  const action = initial ? updateCategoryAction : createCategoryAction;
  const [state, formAction, pending] = useActionState(action, initialActionState);
  const [fields, setFields] = useState<CategoryField[]>(
    () => initial?.fieldDefinitions ?? [],
  );
  const formId = initial?.id ?? "new-category";

  function updateField(index: number, update: Partial<CategoryField>) {
    setFields((current) =>
      current.map((field, fieldIndex) =>
        fieldIndex === index ? { ...field, ...update } : field,
      ),
    );
  }

  return (
    <form action={formAction} className="grid gap-5" noValidate>
      <FormFeedback message={state.message} success={state.success} />
      {initial ? <input type="hidden" name="categoryId" value={initial.id} /> : null}
      <input type="hidden" name="fieldDefinitions" value={JSON.stringify(fields)} />
      <InputField
        label="Category name"
        name="name"
        id={`${formId}-name`}
        placeholder="e.g. Electronics"
        defaultValue={initial?.name}
        error={state.fieldErrors?.name?.[0]}
        required
      />
      <TextareaField
        label="Description"
        name="description"
        id={`${formId}-description`}
        placeholder="Describe the assets grouped here"
        defaultValue={initial?.description ?? ""}
      />

      <div className="rounded-2xl border border-[#d9e0da] bg-[#f8faf8] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold">Category-specific fields</h3>
            <p className="mt-1 text-xs leading-5 text-[#718078]">
              Add fields that appear only when registering assets in this category.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={fields.length >= 12}
            onClick={() =>
              setFields((current) => [
                ...current,
                { key: "", label: "", type: "text", required: false },
              ])
            }
          >
            <Plus className="size-3.5" weight="bold" aria-hidden="true" />
            Add field
          </Button>
        </div>

        {fields.length > 0 ? (
          <div className="mt-4 grid gap-3">
            {fields.map((field, index) => (
              <div
                key={`${index}-${field.key}`}
                className="grid gap-3 rounded-xl border border-[#dce3dd] bg-white p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_120px_auto] sm:items-end"
              >
                <InputField
                  label="Key"
                  name={`field-key-${index}`}
                  id={`${formId}-field-key-${index}`}
                  value={field.key}
                  placeholder="warrantyMonths"
                  onChange={(event) => updateField(index, { key: event.target.value })}
                />
                <InputField
                  label="Label"
                  name={`field-label-${index}`}
                  id={`${formId}-field-label-${index}`}
                  value={field.label}
                  placeholder="Warranty period"
                  onChange={(event) => updateField(index, { label: event.target.value })}
                />
                <SelectField
                  label="Type"
                  name={`field-type-${index}`}
                  id={`${formId}-field-type-${index}`}
                  value={field.type}
                  onChange={(event) =>
                    updateField(index, {
                      type: event.target.value as CategoryField["type"],
                    })
                  }
                >
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="date">Date</option>
                  <option value="boolean">Yes / No</option>
                </SelectField>
                <button
                  type="button"
                  title="Remove custom field"
                  onClick={() =>
                    setFields((current) =>
                      current.filter((_, fieldIndex) => fieldIndex !== index),
                    )
                  }
                  className="grid size-10 place-items-center rounded-xl border border-[#e4c9c9] text-[#a34343] hover:bg-[#fff1f1]"
                >
                  <Trash className="size-4" aria-hidden="true" />
                  <span className="sr-only">Remove {field.label || "field"}</span>
                </button>
                <label className="flex items-center gap-2 text-xs font-semibold text-[#526158] sm:col-span-full">
                  <input
                    type="checkbox"
                    checked={field.required}
                    onChange={(event) =>
                      updateField(index, { required: event.target.checked })
                    }
                    className="size-4 accent-[#39755b]"
                  />
                  Required during asset registration
                </label>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 rounded-xl border border-dashed border-[#cfd8d1] px-4 py-7 text-center text-xs text-[#718078]">
            No custom fields. Core asset fields will still be collected.
          </p>
        )}
      </div>

      <label className="flex min-h-11 items-center gap-3 rounded-xl border border-[#d6ded8] bg-[#f8faf8] px-3.5 text-sm font-semibold text-[#3a4940]">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={initial?.isActive ?? true}
          className="size-4 accent-[#39755b]"
        />
        Active and available during asset registration
      </label>
      <Button type="submit" className="justify-self-start" disabled={pending}>
        {initial ? (
          <FloppyDisk className="size-4" weight="bold" aria-hidden="true" />
        ) : (
          <Plus className="size-4" weight="bold" aria-hidden="true" />
        )}
        {pending
          ? "Saving category..."
          : initial
            ? "Save category"
            : "Create category"}
      </Button>
    </form>
  );
}
