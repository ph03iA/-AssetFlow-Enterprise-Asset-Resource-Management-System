import { describe, expect, it } from "vitest";

import { loginSchema, signupSchema } from "./auth-inputs";

describe("public account input", () => {
  it("normalizes safe signup fields", () => {
    const result = signupSchema.parse({
      name: "  Kavya Rao  ",
      email: "  KAVYA@EXAMPLE.COM ",
      password: "AssetFlow2026!",
    });

    expect(result).toEqual({
      name: "Kavya Rao",
      email: "kavya@example.com",
      password: "AssetFlow2026!",
    });
  });

  it("rejects attempted self-elevation at signup", () => {
    const result = signupSchema.safeParse({
      name: "Kavya Rao",
      email: "kavya@example.com",
      password: "AssetFlow2026!",
      role: "ADMIN",
    });

    expect(result.success).toBe(false);
  });

  it("does not apply signup password strength checks to login", () => {
    expect(
      loginSchema.safeParse({
        email: "legacy.user@example.com",
        password: "legacy-secret",
      }).success,
    ).toBe(true);
  });

  it("rejects malformed email addresses", () => {
    expect(
      signupSchema.safeParse({
        name: "Kavya Rao",
        email: "not-an-email",
        password: "AssetFlow2026!",
      }).success,
    ).toBe(false);
  });
});
