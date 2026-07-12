import { describe, expect, it } from "vitest";

import { AssetCondition } from "../../generated/prisma/enums";
import { assetInputSchema, validateCategoryValues } from "./schemas";

const validAsset = {
  name: "ThinkPad X1 Carbon",
  categoryId: "electronics",
  departmentId: "engineering",
  serialNumber: "PF4Z8K2Q",
  description: "Platform engineering laptop",
  acquisitionDate: "2026-01-12",
  acquisitionCost: "146850.00",
  condition: AssetCondition.GOOD,
  location: "Bengaluru - Engineering Floor",
  isBookable: false,
  customValues: {},
  nextMaintenanceAt: "2026-09-12",
  retirementDate: "2029-01-12",
};

describe("asset registration input", () => {
  it("normalizes dates, cost, and optional values", () => {
    const result = assetInputSchema.parse(validAsset);

    expect(result.acquisitionCost).toBe(146850);
    expect(result.acquisitionDate).toBeInstanceOf(Date);
    expect(result.serialNumber).toBe("PF4Z8K2Q");
  });

  it("rejects retirement before acquisition", () => {
    expect(
      assetInputSchema.safeParse({
        ...validAsset,
        retirementDate: "2025-12-01",
      }).success,
    ).toBe(false);
  });
});

describe("category-specific values", () => {
  const definitions = [
    {
      key: "warrantyMonths",
      label: "Warranty period",
      type: "number" as const,
      required: true,
    },
    {
      key: "calibrationDate",
      label: "Calibration date",
      type: "date" as const,
      required: false,
    },
  ];

  it("requires mandatory custom values", () => {
    expect(validateCategoryValues(definitions, {})).toEqual({
      warrantyMonths: "Warranty period is required.",
    });
  });

  it("accepts values matching their field definitions", () => {
    expect(
      validateCategoryValues(definitions, {
        warrantyMonths: 36,
        calibrationDate: "2026-08-12",
      }),
    ).toEqual({});
  });
});
